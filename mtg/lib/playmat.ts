"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlayerId } from "@mtg/engine";

// What each player picks for the table, kept in this browser only:
//   Card sleeves: the back of their cards (library, the draw animation).
//   Playmat: the surface their half of the battlefield is drawn on.
// A choice is stored as "preset:<id>" or as a data: URL for a picture from the computer. Empty = the player's default.

export interface Look {
  id: string;
  name: string;
  /** A CSS `background` value (layers allowed). */
  css: string;
  /** Sleeves only: the color of the thin frame drawn inside the card back. */
  edge?: string;
}

const grain = "repeating-linear-gradient(115deg, rgba(255,255,255,0.035) 0 2px, transparent 2px 8px)";
const dots = "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1.5px) 0 0 / 14px 14px";
const felt = (a: string, b: string, glow: string) => `radial-gradient(ellipse at 50% 0%, ${glow}, transparent 60%), ${grain}, linear-gradient(165deg, ${a}, ${b})`;

export const SLEEVES: Look[] = [
  { id: "classic", name: "Classic gold", edge: "rgba(252,211,77,.55)", css: "linear-gradient(135deg,#b45309,#78350f 55%,#1c1917)" },
  { id: "crimson", name: "Crimson", edge: "rgba(254,202,202,.6)", css: "repeating-linear-gradient(45deg, rgba(255,255,255,.08) 0 5px, transparent 5px 10px), linear-gradient(135deg,#dc2626,#7f1d1d 60%,#1c0a0a)" },
  { id: "azure", name: "Azure", edge: "rgba(186,230,253,.6)", css: "repeating-linear-gradient(-45deg, rgba(255,255,255,.08) 0 5px, transparent 5px 10px), linear-gradient(135deg,#38bdf8,#1d4ed8 55%,#0b1437)" },
  { id: "emerald", name: "Emerald", edge: "rgba(187,247,208,.6)", css: "radial-gradient(circle at 50% 50%, rgba(255,255,255,.12) 0 18%, transparent 19%) 0 0 / 16px 16px, linear-gradient(135deg,#22c55e,#14532d 60%,#052e16)" },
  { id: "violet", name: "Violet", edge: "rgba(221,214,254,.6)", css: "repeating-linear-gradient(45deg, rgba(255,255,255,.07) 0 4px, transparent 4px 9px), linear-gradient(135deg,#a78bfa,#5b21b6 55%,#1e0a3c)" },
  { id: "obsidian", name: "Obsidian", edge: "rgba(250,204,21,.7)", css: "repeating-linear-gradient(135deg, rgba(250,204,21,.12) 0 1px, transparent 1px 9px), linear-gradient(135deg,#27272a,#09090b)" },
  { id: "silver", name: "Silver", edge: "rgba(255,255,255,.8)", css: "linear-gradient(135deg,#e2e8f0,#64748b 55%,#1e293b)" },
  { id: "dragon", name: "Dragon scale", edge: "rgba(253,186,116,.65)", css: "radial-gradient(circle at 50% 0, transparent 40%, rgba(0,0,0,.35) 42% 50%, transparent 52%) 0 0 / 15px 12px, linear-gradient(160deg,#f97316,#b91c1c 55%,#2a0707)" },
  { id: "wheel", name: "Mana wheel", edge: "rgba(255,255,255,.65)", css: "radial-gradient(circle at 50% 50%, #0b0f1a 0 22%, transparent 23%), conic-gradient(from 0deg, #fde68a, #60a5fa, #a78bfa, #fb7185, #4ade80, #fde68a)" },
];

export const MATS: Look[] = [
  { id: "azure", name: "Azure felt", css: felt("#1e3a8a", "#0b1437", "rgba(125,211,252,.28)") },
  { id: "crimson", name: "Crimson felt", css: felt("#991b1b", "#2a0707", "rgba(253,164,175,.26)") },
  { id: "forest", name: "Forest", css: felt("#166534", "#052e16", "rgba(134,239,172,.26)") },
  { id: "plains", name: "Plains", css: felt("#a8873f", "#4a3a14", "rgba(254,243,199,.35)") },
  { id: "island", name: "Island", css: felt("#0e7490", "#082f49", "rgba(165,243,252,.3)") },
  { id: "swamp", name: "Swamp", css: felt("#4c1d95", "#150a2e", "rgba(196,181,253,.24)") },
  { id: "mountain", name: "Mountain", css: felt("#c2410c", "#3b0f06", "rgba(253,186,116,.3)") },
  { id: "obsidian", name: "Obsidian", css: `repeating-linear-gradient(135deg, rgba(250,204,21,.07) 0 1px, transparent 1px 22px), ${dots}, linear-gradient(160deg,#18181b,#020202)` },
  { id: "walnut", name: "Walnut table", css: "repeating-linear-gradient(90deg, rgba(0,0,0,.12) 0 3px, transparent 3px 11px), repeating-linear-gradient(90deg, rgba(255,255,255,.04) 0 1px, transparent 1px 37px), linear-gradient(180deg,#7c4a21,#3b200c)" },
  { id: "wheel", name: "Mana wheel", css: "radial-gradient(circle at 50% 50%, rgba(5,8,22,.88) 0 20%, transparent 21%), conic-gradient(from 20deg, #78350f, #1e3a8a, #4c1d95, #7f1d1d, #14532d, #78350f)" },
];

/** What each player gets until they choose something else. */
export const DEFAULT_MAT: Record<PlayerId, string> = { p1: "azure", p2: "crimson" };
export const DEFAULT_SLEEVE = "classic";

const key = (kind: "sleeve" | "mat", who: PlayerId) => `mtg-${kind}-${who}`;
function read(k: string): string {
  try {
    return localStorage.getItem(k) ?? "";
  } catch {
    return "";
  }
}
function write(k: string, v: string): boolean {
  try {
    if (v) localStorage.setItem(k, v);
    else localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

/** The look for a stored choice (or the default), as a CSS background and the sleeve's frame color. */
export function resolve(kind: "sleeve" | "mat", stored: string, who: PlayerId): { css: string; edge: string; id: string | null } {
  const list = kind === "sleeve" ? SLEEVES : MATS;
  if (stored.startsWith("data:")) return { css: `center / cover url("${stored}")`, edge: "rgba(255,255,255,.55)", id: null };
  const id = stored.startsWith("preset:") ? stored.slice(7) : kind === "sleeve" ? DEFAULT_SLEEVE : DEFAULT_MAT[who];
  const look = list.find((l) => l.id === id) ?? list[0];
  return { css: look.css, edge: look.edge ?? "rgba(255,255,255,.5)", id: look.id };
}

// The draw animation is plain DOM outside React, so the sleeves are also kept where it can read them.
const live: Record<PlayerId, { css: string; edge: string }> = { p1: { css: SLEEVES[0].css, edge: SLEEVES[0].edge! }, p2: { css: SLEEVES[0].css, edge: SLEEVES[0].edge! } };
export const sleeveOf = (who: PlayerId) => live[who];

/** Shrinks a picture to `maxWidth` pixels wide and returns it as a JPEG data URL, so it fits in browser storage. */
function shrink(file: File, maxWidth: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file is not a picture the browser can open."));
    };
    img.src = url;
  });
}

type Stored = Record<PlayerId, string>;

/** Both players' sleeves and playmats, with ways to change them. */
export function useAppearance() {
  const [sleeves, setSleeves] = useState<Stored>(() => ({ p1: read(key("sleeve", "p1")), p2: read(key("sleeve", "p2")) }));
  const [mats, setMats] = useState<Stored>(() => ({ p1: read(key("mat", "p1")), p2: read(key("mat", "p2")) }));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    for (const who of ["p1", "p2"] as const) {
      const s = resolve("sleeve", sleeves[who], who);
      live[who] = { css: s.css, edge: s.edge };
    }
  }, [sleeves]);

  const set = useCallback((kind: "sleeve" | "mat", who: PlayerId, value: string) => {
    setError(null);
    (kind === "sleeve" ? setSleeves : setMats)((cur) => ({ ...cur, [who]: value }));
    if (!write(key(kind, who), value)) setError("The browser could not save that (storage is full or blocked).");
  }, []);

  const upload = useCallback(
    async (kind: "sleeve" | "mat", who: PlayerId, file: File) => {
      try {
        set(kind, who, await shrink(file, kind === "sleeve" ? 360 : 1600));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not use that picture.");
      }
    },
    [set],
  );

  return {
    sleeve: (who: PlayerId) => resolve("sleeve", sleeves[who], who),
    mat: (who: PlayerId) => resolve("mat", mats[who], who),
    storedSleeve: sleeves,
    storedMat: mats,
    choose: set,
    upload,
    error,
  };
}
