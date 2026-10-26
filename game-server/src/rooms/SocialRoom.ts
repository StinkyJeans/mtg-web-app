import { Room, Client, matchMaker } from "colyseus";
import { accountFromToken, friendIdsOf } from "../supabase.js";
import type { Account } from "../supabase.js";
import { LIMITS } from "../limits.js";
import { acctKey, inviteKey } from "./MatchRoom.js";
import type { RoomMeta, Stage } from "./MatchRoom.js";

/**
 * Who is online, for the friends list. Every signed-in browser joins this one room. A browser asks "how are these
 * friends?" every few seconds; asking also tells the server that this player is here, and the answer says, for each
 * friend, whether they are online and which match they are in. Only the player's accepted friends are ever answered.
 */
const ONLINE_SECONDS = 50; // without a new question for this long, a player counts as gone (a closed tab leaves at once)
const onlineKey = (accountId: string) => `online:${accountId}`;
const inboxTopic = (accountId: string) => `inbox:${accountId}`;
const INVITE_VALID_SECONDS = 900; // a friend invited to a room can join it (password or not) for this long
const INVITE_AGAIN_SECONDS = 20; // the same friend can't be invited again at once


/** What a friend is sent when invited to a match. */
export interface InvitePayload {
  fromId: string;
  from: string;
  roomId: string;
  roomName: string;
  locked: boolean;
}

export interface FriendStatus {
  id: string;
  online: boolean;
  /** The room this friend is in, with what the website needs to offer "Watch". Null when they are in none. */
  match: { roomId: string; name: string; locked: boolean; status: Stage; bot: boolean; spectators: number; players: string[] } | null;
}

export class SocialRoom extends Room {
  maxClients = 5000;
  maxMessagesPerSecond = LIMITS.messagesPerSecond();

  /** Browsers of each account connected to this process: a player with two tabs stays online until the last one closes. */
  private static connections = new Map<string, number>();

  /** The messages sent to each connected browser's inbox (invitations), so they can be stopped when it leaves. */
  private inboxes = new Map<string, { topic: string; listener: (data: InvitePayload) => void }>();

  messages = {
    /** Invites a friend to the match room this player is in: it must be one that is waiting for its second player. */
    invite: async (client: Client, message: { to?: unknown; roomId?: unknown }) => {
      const me = client.auth as Account | undefined;
      if (!me) return;
      const fail = (text: string) => client.send("invite-failed", { message: text });
      const to = typeof message?.to === "string" ? message.to.slice(0, 80) : "";
      const roomId = typeof message?.roomId === "string" ? message.roomId.slice(0, 40) : "";
      if (!to || !roomId || to === me.id) return fail("Could not send that invitation.");
      if (!(await friendIdsOf(me.id, 3000)).has(to)) return fail("You can only invite your friends.");
      if (await Promise.resolve(this.presence.get(`invite-cd:${me.id}:${to}`))) return fail("You just invited them. Give them a moment.");
      if (!(await Promise.resolve(this.presence.get(onlineKey(to))))) return fail("That friend is not online right now.");
      let meta: Partial<RoomMeta> | undefined;
      let full = true;
      try {
        const room = await matchMaker.getRoomById(roomId);
        if (room && room.name === "match") {
          meta = room.metadata as Partial<RoomMeta>;
          full = room.clients >= room.maxClients;
        }
      } catch {
        // the room closed
      }
      if (!meta || !(meta.players ?? []).includes(me.username)) return fail("Open a room first, then invite your friend to it.");
      if (meta.status !== "waiting" || meta.bot === true || full) return fail("That room can't take another player.");
      await this.presence.setex(inviteKey(roomId, to), "1", INVITE_VALID_SECONDS);
      await this.presence.setex(`invite-cd:${me.id}:${to}`, "1", INVITE_AGAIN_SECONDS);
      const payload: InvitePayload = { fromId: me.id, from: me.username, roomId, roomName: meta.name ?? "Room", locked: meta.locked === true };
      await this.presence.publish(inboxTopic(to), payload);
      client.send("invited", { to });
    },

    statuses: async (client: Client, message: { ids?: unknown }) => {
      const me = client.auth as Account | undefined;
      if (!me) return;
      const ids = Array.isArray(message?.ids) ? (message.ids as unknown[]).filter((x): x is string => typeof x === "string").slice(0, 100) : [];
      await this.presence.setex(onlineKey(me.id), "1", ONLINE_SECONDS);
      let friends = await friendIdsOf(me.id);
      // asked about someone not (yet) known as a friend: look again, in case they just accepted
      if (ids.some((id) => !friends.has(id))) friends = await friendIdsOf(me.id, 3000);
      const out: FriendStatus[] = [];
      for (const id of ids) if (friends.has(id)) out.push(await this.statusOf(id));
      client.send("statuses", out);
    },
  };

  async onAuth(_client: Client, options: { token?: string }) {
    const account = await accountFromToken(options?.token);
    if (!account) throw new Error("Please sign in again.");
    return account;
  }

  async onJoin(client: Client, _options: unknown, account?: Account) {
    const me = (account ?? (client.auth as Account | undefined))!;
    SocialRoom.connections.set(me.id, (SocialRoom.connections.get(me.id) ?? 0) + 1);
    await this.presence.setex(onlineKey(me.id), "1", ONLINE_SECONDS);
    // invitations from friends arrive here, whichever server process the friend is connected to
    const listener = (data: InvitePayload) => client.send("invite", data);
    this.inboxes.set(client.sessionId, { topic: inboxTopic(me.id), listener });
    await this.presence.subscribe(inboxTopic(me.id), listener);
  }

  async onLeave(client: Client) {
    const inbox = this.inboxes.get(client.sessionId);
    if (inbox) {
      this.inboxes.delete(client.sessionId);
      await this.presence.unsubscribe(inbox.topic, inbox.listener);
    }
    const me = client.auth as Account | undefined;
    if (!me) return;
    const left = (SocialRoom.connections.get(me.id) ?? 1) - 1;
    if (left > 0) return void SocialRoom.connections.set(me.id, left);
    SocialRoom.connections.delete(me.id);
    await this.presence.del(onlineKey(me.id));
  }

  private async statusOf(id: string): Promise<FriendStatus> {
    const online = Boolean(await Promise.resolve(this.presence.get(onlineKey(id))));
    const roomId = (await Promise.resolve(this.presence.get(acctKey(id)))) as string | null;
    let match: FriendStatus["match"] = null;
    if (roomId) {
      try {
        const room = await matchMaker.getRoomById(roomId);
        const meta = room?.metadata as Partial<RoomMeta> | undefined;
        if (meta) match = { roomId, name: meta.name ?? "Room", locked: meta.locked === true, status: meta.status ?? "waiting", bot: meta.bot === true, spectators: meta.spectators ?? 0, players: meta.players ?? [] };
      } catch {
        // the room just closed
      }
    }
    return { id, online: online || match !== null, match };
  }
}
