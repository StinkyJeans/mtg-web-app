"use client";

import { createClient } from "@/lib/supabase/client";

// A player's profile: name, picture, and win / loss record. All of it belongs to the signed-in account.

export interface Me {
  id: string;
  name: string;
  /** Address of the picture, or null. */
  avatar: string | null;
}

/** Where a player's picture lives. `version` changes with every new picture, so browsers fetch the new one. */
export function avatarUrl(id: string, version: string | number): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${id}.jpg?v=${version}`;
}

export async function loadMe(): Promise<Me | null> {
  const { data } = await createClient().auth.getUser();
  const u = data.user;
  if (!u) return null;
  const stored = u.user_metadata.avatar as string | number | undefined; // a version number; older accounts hold the picture itself
  const legacy = typeof stored === "string" && stored.startsWith("data:");
  const me: Me = {
    id: u.id,
    name:
      (u.user_metadata.username as string | undefined) ??
      u.email?.split("@")[0] ??
      "player",
    avatar:
      stored === undefined || stored === null || stored === ""
        ? null
        : legacy
          ? stored
          : avatarUrl(u.id, stored),
  };
  if (legacy) void moveLegacyPicture(stored as string); // pictures used to live inside the login token, which made every request heavier
  return me;
}

async function moveLegacyPicture(dataUrl: string) {
  try {
    await saveAvatar(await (await fetch(dataUrl)).blob());
  } catch {
    // it keeps working as it is; the next visit tries again
  }
}

async function token(): Promise<string> {
  const { data } = await createClient().auth.getSession();
  if (!data.session) throw new Error("Please sign in again.");
  return data.session.access_token;
}

/** Saves (or, with null, removes) the picture. Returns its address. */
export async function saveAvatar(picture: Blob | null): Promise<string | null> {
  const res = await fetch("/api/avatar", {
    method: picture ? "POST" : "DELETE",
    headers: {
      authorization: `Bearer ${await token()}`,
      ...(picture ? { "content-type": "image/jpeg" } : {}),
    },
    body: picture ?? undefined,
  });
  const body = (await res.json().catch(() => ({}))) as {
    version?: number;
    error?: string;
  };
  if (!res.ok) throw new Error(body.error ?? "Could not save the picture.");
  // only a small version number goes into the account, never the picture
  const { error } = await createClient().auth.updateUser({
    data: { avatar: picture ? body.version : null },
  });
  if (error) throw new Error(error.message);
  const { data } = await createClient().auth.getUser();
  return picture && data.user ? avatarUrl(data.user.id, body.version!) : null;
}

const MAX_PICTURE_BYTES = 120_000;

/** Crops the middle square out of a picture and shrinks it to a JPEG. */
export function squarePicture(file: File, size = 256): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      URL.revokeObjectURL(url);
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx)
        return reject(new Error("Your browser can't prepare pictures."));
      ctx.fillStyle = "#fff"; // transparent pictures get a white background
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(
        img,
        (img.width - side) / 2,
        (img.height - side) / 2,
        side,
        side,
        0,
        0,
        size,
        size,
      );
      for (const quality of [0.88, 0.8, 0.7, 0.6, 0.5, 0.4]) {
        const blob = await new Promise<Blob | null>((r) =>
          canvas.toBlob(r, "image/jpeg", quality),
        );
        if (blob && blob.size <= MAX_PICTURE_BYTES) return resolve(blob);
      }
      reject(
        new Error("That picture is too detailed to shrink. Try another one."),
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file is not a picture the browser can open."));
    };
    img.src = url;
  });
}

export interface MatchLine {
  id: string;
  opponent: string;
  result: "win" | "loss" | "draw";
  turns: number | null;
  playedAt: string;
}

export interface Stats {
  wins: number;
  losses: number;
  draws: number;
  /** The latest few, newest first. */
  recent: MatchLine[];
}

/** The record from the finished matches this account played (games against the bot are not recorded). */
export async function loadStats(me: string): Promise<Stats> {
  const supabase = createClient();
  const mine = `p1.eq.${me},p2.eq.${me}`;
  // counted by the database: the record stays quick however many matches there are
  const [total, wins, draws, latest] = await Promise.all([
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .or(mine),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("winner", me),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .or(mine)
      .is("winner", null),
    supabase
      .from("matches")
      .select("id, p1, p2, winner, turns, played_at")
      .or(mine)
      .order("played_at", { ascending: false })
      .limit(6),
  ]);
  for (const r of [total, wins, draws, latest])
    if (r.error) throw new Error(r.error.message);
  const rows = (latest.data ?? []) as {
    id: string;
    p1: string;
    p2: string;
    winner: string | null;
    turns: number | null;
    played_at: string;
  }[];
  const resultOf = (r: (typeof rows)[number]): MatchLine["result"] =>
    r.winner === null ? "draw" : r.winner === me ? "win" : "loss";
  const w = wins.count ?? 0;
  const d = draws.count ?? 0;
  const stats: Stats = {
    wins: w,
    draws: d,
    losses: Math.max(0, (total.count ?? 0) - w - d),
    recent: [],
  };
  const others = [...new Set(rows.map((r) => (r.p1 === me ? r.p2 : r.p1)))];
  const names = new Map<string, string>();
  if (others.length > 0) {
    const { data: people } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", others);
    for (const p of (people ?? []) as { id: string; username: string }[])
      names.set(p.id, p.username);
  }
  stats.recent = rows.map((r) => ({
    id: r.id,
    opponent: names.get(r.p1 === me ? r.p2 : r.p1) ?? "a player",
    result: resultOf(r),
    turns: r.turns,
    playedAt: r.played_at,
  }));
  return stats;
}
