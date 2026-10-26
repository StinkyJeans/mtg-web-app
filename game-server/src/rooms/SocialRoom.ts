import { Room, Client, matchMaker } from "colyseus";
import { accountFromToken, friendIdsOf } from "../supabase.js";
import type { Account } from "../supabase.js";
import { LIMITS } from "../limits.js";
import { acctKey } from "./MatchRoom.js";
import type { RoomMeta, Stage } from "./MatchRoom.js";

/**
 * Who is online, for the friends list. Every signed-in browser joins this one room. A browser asks "how are these
 * friends?" every few seconds; asking also tells the server that this player is here, and the answer says, for each
 * friend, whether they are online and which match they are in. Only the player's accepted friends are ever answered.
 */
const ONLINE_SECONDS = 50; // without a new question for this long, a player counts as gone (a closed tab leaves at once)
const onlineKey = (accountId: string) => `online:${accountId}`;

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

  messages = {
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
  }

  async onLeave(client: Client) {
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
