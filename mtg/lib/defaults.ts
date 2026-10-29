import { createClient } from "@/lib/supabase/client";
import { myLook } from "@/lib/playmat";

// What a player picked last time they chose a deck: the deck, the card sleeve and the playmat. It is kept on this device (so it is there at once)
// and on the account (so it follows the player to another device). Only short names are stored: a picture from the computer is never sent.

export interface Defaults {
  deck?: string;
  sleeve?: string;
  mat?: string;
}

const DECK_KEY = "mtg-default-deck";

export function readDeckDefault(): string {
  try {
    return localStorage.getItem(DECK_KEY) ?? "";
  } catch {
    return "";
  }
}

const short = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 60 && !v.startsWith("data:");

/** The account's defaults, also written to this device where it has none of its own. */
export async function loadDefaults(): Promise<Defaults> {
  try {
    const { data } = await createClient().auth.getUser();
    const saved = (data.user?.user_metadata?.defaults ?? {}) as Defaults;
    const out: Defaults = {};
    if (short(saved.deck)) out.deck = saved.deck;
    if (short(saved.sleeve)) out.sleeve = saved.sleeve;
    if (short(saved.mat)) out.mat = saved.mat;
    if (out.sleeve && !myLook.read("sleeve")) myLook.write("sleeve", out.sleeve);
    if (out.mat && !myLook.read("mat")) myLook.write("mat", out.mat);
    if (out.deck && !readDeckDefault()) {
      try {
        localStorage.setItem(DECK_KEY, out.deck);
      } catch {
        // (kept on the account only)
      }
    }
    return out;
  } catch {
    return {};
  }
}

/** Makes this choice the player's default, on this device and on the account. Never throws: a failed save only means it is not remembered. */
export async function saveDefaults(d: Defaults): Promise<void> {
  try {
    if (d.deck) localStorage.setItem(DECK_KEY, d.deck);
  } catch {
    // (the account copy below still works)
  }
  try {
    const clean: Defaults = {};
    if (short(d.deck)) clean.deck = d.deck;
    if (short(d.sleeve)) clean.sleeve = d.sleeve;
    if (short(d.mat)) clean.mat = d.mat;
    await createClient().auth.updateUser({ data: { defaults: clean } });
  } catch {
    // (not remembered on the account this time)
  }
}
