"use client";

import { createClient } from "@/lib/supabase/client";
import { avatarUrl } from "@/lib/profile";

// Friends: a list of people you play with, found by searching their name. Everything goes through Supabase with the
// player's own login, so the database rules (supabase/05-friends.sql) decide who can see and change what.

export interface Person {
  id: string;
  username: string;
  /** A name the player chose to show instead of their login name. */
  nickname: string | null;
  avatar: string | null;
}

/** What to call someone: their nickname if they set one, else their login name. */
export const displayName = (p: { username: string; nickname: string | null }) =>
  p.nickname || p.username;

export type Relation = "friend" | "incoming" | "outgoing";

export interface Link {
  rowId: string;
  relation: Relation;
  person: Person;
}

/** The database part of friends has not been installed yet (supabase/05-friends.sql). */
export class NotSetUp extends Error {
  constructor() {
    super(
      "Friends are not set up yet. Run supabase/05-friends.sql once in the Supabase SQL editor.",
    );
  }
}

const PERSON = "id, username, nickname, avatar_v";
type PersonRow = {
  id: string;
  username: string;
  nickname: string | null;
  avatar_v: number | null;
};

const toPerson = (r: PersonRow): Person => ({
  id: r.id,
  username: r.username,
  nickname: r.nickname,
  avatar: r.avatar_v ? avatarUrl(r.id, r.avatar_v) : null,
});

function check(error: { code?: string; message: string } | null) {
  if (!error) return;
  if (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    error.code === "42703" ||
    /schema cache|does not exist/i.test(error.message)
  )
    throw new NotSetUp();
  throw new Error(error.message);
}

/** Everyone linked to `me`: friends, people who asked to be (incoming) and people asked by me (outgoing). */
export async function listLinks(me: string): Promise<Link[]> {
  const { data, error } = await createClient()
    .from("friendships")
    .select(
      `id, requester, addressee, status, requester_profile:profiles!friendships_requester_fkey(${PERSON}), addressee_profile:profiles!friendships_addressee_fkey(${PERSON})`,
    )
    .order("created_at", { ascending: false })
    .limit(400);
  check(error);
  const rows = (data ?? []) as unknown as {
    id: string;
    requester: string;
    status: "pending" | "accepted";
    requester_profile: PersonRow | null;
    addressee_profile: PersonRow | null;
  }[];
  const links: Link[] = [];
  for (const r of rows) {
    const mine = r.requester === me;
    const other = mine ? r.addressee_profile : r.requester_profile;
    if (!other) continue;
    links.push({
      rowId: r.id,
      relation:
        r.status === "accepted" ? "friend" : mine ? "outgoing" : "incoming",
      person: toPerson(other),
    });
  }
  return links.sort((a, b) =>
    displayName(a.person).localeCompare(displayName(b.person), undefined, {
      sensitivity: "base",
    }),
  );
}

/** Players whose name (login or nickname) contains the text. */
export async function searchPeople(
  me: string,
  text: string,
): Promise<Person[]> {
  const q = text
    .replace(/[,()*%_\\]/g, " ")
    .trim()
    .slice(0, 40);
  if (q.length < 2) return [];
  const { data, error } = await createClient()
    .from("profiles")
    .select(PERSON)
    .or(`username.ilike.*${q}*,nickname.ilike.*${q}*`)
    .neq("id", me)
    .order("username")
    .limit(12);
  check(error);
  return ((data ?? []) as PersonRow[]).map(toPerson);
}

export async function sendRequest(me: string, other: string): Promise<void> {
  const { error } = await createClient()
    .from("friendships")
    .insert({ requester: me, addressee: other });
  if (error?.code === "23505")
    throw new Error(
      "There is already a request or friendship with this player.",
    );
  check(error);
}

export async function acceptRequest(rowId: string): Promise<void> {
  const { error } = await createClient()
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", rowId);
  check(error);
}

/** Unfriend, decline a request, or cancel one you sent. */
export async function removeLink(rowId: string): Promise<void> {
  const { error } = await createClient()
    .from("friendships")
    .delete()
    .eq("id", rowId);
  check(error);
}
