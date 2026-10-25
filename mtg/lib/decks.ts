import { unplayableCards, validateDeck } from "@mtg/engine";
import type { CardDef } from "@mtg/engine";
import { createClient } from "@/lib/supabase/client";
import { fetchCardsByIds } from "@/lib/cards";

/** card id -> number of copies */
export type DeckEntries = Record<string, number>;

export interface Deck {
  id: string;
  name: string;
  entries: DeckEntries;
}

/** An official deck the game can fully play. `entries` are the cards it plays with (main deck and commander). */
export interface OfficialDeck extends Deck {
  deckType: string | null;
  code: string | null;
  releaseDate: string | null;
}

interface DeckCardRow {
  card_id: string;
  qty: number;
  board: string;
}

/** The game only uses the main deck (and a Commander deck's commander). The sideboard is ignored. */
function toEntries(rows: DeckCardRow[]): DeckEntries {
  const entries: DeckEntries = {};
  for (const row of rows) if (row.board !== "side") entries[row.card_id] = (entries[row.card_id] ?? 0) + row.qty;
  return entries;
}

/** One id per copy, e.g. {"mountain": 2} -> ["mountain", "mountain"]. This is what the engine takes. */
export function expandDeck(entries: DeckEntries): string[] {
  return Object.entries(entries).flatMap(([id, qty]) => Array<string>(qty).fill(id));
}

export interface DeckStatus {
  count: number;
  errors: string[];
  unplayable: CardDef[];
  /** Legal AND every card is playable by the engine: can start a game. */
  ready: boolean;
}

export function deckStatus(defs: Record<string, CardDef>, entries: DeckEntries): DeckStatus {
  const ids = expandDeck(entries);
  const errors = validateDeck(defs, ids);
  const unplayable = unplayableCards(defs, ids);
  return { count: ids.length, errors, unplayable, ready: errors.length === 0 && unplayable.length === 0 };
}

export async function listMyDecks(): Promise<Deck[]> {
  const { data, error } = await createClient()
    .from("decks")
    .select("id, name, deck_cards(card_id, qty, board)")
    .eq("official", false)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as { id: string; name: string; deck_cards: DeckCardRow[] }[]).map((d) => ({
    id: d.id,
    name: d.name,
    entries: toEntries(d.deck_cards),
  }));
}

export const DECK_PAGE_SIZE = 13;

/** The sections of the official decks, in order. A deck of any other type gets a section of its own after these. */
export const OFFICIAL_SECTIONS: { deckType: string; title: string; blurb: string }[] = [
  { deckType: "Theme Deck", title: "Theme decks", blurb: "Ready-to-play decks built around one idea." },
  { deckType: "Foundations", title: "Foundations pairs", blurb: "Two Foundations Jumpstart packs shuffled together: 40 cards." },
];

const SET_NAMES: Record<string, string> = { SOS: "Secrets of Strixhaven", ECL: "Lorwyn Eclipse", FDN: "Foundations" };
export const setName = (code: string | null) => (code ? (SET_NAMES[code] ?? code) : null);

/** The official decks the game can fully play, newest first. Decks with cards the game can't play yet aren't listed. */
export async function listOfficialDecks(): Promise<OfficialDeck[]> {
  const supabase = createClient();
  // The database view knows how many unplayable cards each deck has (supabase/03-playable-decks.sql).
  const { data, error } = await supabase
    .from("official_decks_status")
    .select("id, name, deck_type, code, release_date")
    .eq("unplayable", 0)
    .order("release_date", { ascending: false, nullsFirst: false })
    .order("name");
  if (error) throw new Error(`${error.message}. To list the official decks, run supabase/03-playable-decks.sql once in the Supabase SQL editor.`);
  const rows = data as { id: string; name: string; deck_type: string | null; code: string | null; release_date: string | null }[];
  if (rows.length === 0) return [];
  const cards = await supabase.from("deck_cards").select("deck_id, card_id, qty, board").in("deck_id", rows.map((d) => d.id));
  if (cards.error) throw new Error(cards.error.message);
  const byDeck = new Map<string, DeckCardRow[]>();
  for (const c of cards.data as (DeckCardRow & { deck_id: string })[]) byDeck.set(c.deck_id, [...(byDeck.get(c.deck_id) ?? []), c]);
  return rows.map((d) => ({ id: d.id, name: d.name, deckType: d.deck_type, code: d.code, releaseDate: d.release_date, entries: toEntries(byDeck.get(d.id) ?? []) }));
}

/** A deck's colors in WUBRG order, from its cards. */
export function deckColors(defs: Record<string, CardDef>, entries: DeckEntries): string[] {
  const used = new Set(Object.keys(entries).flatMap((id) => defs[id]?.colors ?? []));
  return ["W", "U", "B", "R", "G"].filter((c) => used.has(c));
}

export interface DeckChoice {
  id: string;
  name: string;
  ids: string[];
  official: boolean;
}

/**
 * The decks a player can start a game with: their own saved decks that are legal and fully playable, then the official ones.
 * `hidden` is how many of their own decks aren't ready yet.
 */
export async function listPlayableDecks(): Promise<{ choices: DeckChoice[]; hidden: number }> {
  const [mine, official] = await Promise.all([listMyDecks(), listOfficialDecks().catch(() => [])]);
  const defs = await loadDefsFor([...mine, ...official]);
  const ready = (d: Deck) => deckStatus(defs, d.entries).ready;
  const choice = (d: Deck, isOfficial: boolean): DeckChoice => ({ id: d.id, name: d.name, ids: expandDeck(d.entries), official: isOfficial });
  return {
    choices: [...mine.filter(ready).map((d) => choice(d, false)), ...official.filter(ready).map((d) => choice(d, true))],
    hidden: mine.filter((d) => !ready(d)).length,
  };
}

export async function getDeck(id: string): Promise<Deck & { official: boolean }> {
  const { data, error } = await createClient()
    .from("decks")
    .select("id, name, official, deck_cards(card_id, qty, board)")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  const d = data as { id: string; name: string; official: boolean; deck_cards: DeckCardRow[] };
  return { id: d.id, name: d.name, official: d.official, entries: toEntries(d.deck_cards) };
}

/** Creates the deck when `id` is missing. Returns the deck id. */
export async function saveDeck(deck: { id?: string; name: string; entries: DeckEntries }): Promise<string> {
  const supabase = createClient();
  const name = deck.name.trim().slice(0, 120) || "Untitled deck";

  let id = deck.id;
  if (id) {
    const { error } = await supabase.from("decks").update({ name }).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase.from("decks").insert({ name }).select("id").single();
    if (error) throw new Error(error.message);
    id = (data as { id: string }).id;
  }

  const cardIds = Object.keys(deck.entries).filter((card) => deck.entries[card] > 0);
  if (cardIds.length) {
    const rows = cardIds.map((card_id) => ({ deck_id: id, card_id, qty: deck.entries[card_id], board: "main" }));
    const { error } = await supabase.from("deck_cards").upsert(rows, { onConflict: "deck_id,card_id,board" });
    if (error) throw new Error(error.message);
  }

  // Remove cards that are no longer in the deck (written after the upsert so a failure never loses cards).
  let stale = supabase.from("deck_cards").delete().eq("deck_id", id);
  if (cardIds.length) stale = stale.not("card_id", "in", `(${cardIds.join(",")})`);
  const { error } = await stale;
  if (error) throw new Error(error.message);
  return id;
}

export async function deleteDeck(id: string): Promise<void> {
  const { error } = await createClient().from("decks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Makes an editable copy of an official deck in the signed-in player's account. */
export async function copyOfficialDeck(officialId: string): Promise<string> {
  const source = await getDeck(officialId);
  return saveDeck({ name: source.name, entries: source.entries });
}

/** Loads card definitions for a set of decks, for checking whether they're ready to play. */
export async function loadDefsFor(decks: Deck[]): Promise<Record<string, CardDef>> {
  return fetchCardsByIds(decks.flatMap((d) => Object.keys(d.entries)));
}

export type DeckBoard = "commander" | "main" | "side";

export interface DeckContents {
  id: string;
  name: string;
  /** Cards of each section, so a preview can show the commander and sideboard separately. */
  boards: Record<DeckBoard, DeckEntries>;
}

/** Everything inside a deck, split by section. Works for official decks and your own. */
export async function getDeckContents(id: string): Promise<DeckContents> {
  const { data, error } = await createClient()
    .from("decks")
    .select("id, name, deck_cards(card_id, qty, board)")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  const d = data as { id: string; name: string; deck_cards: DeckCardRow[] };
  const boards: DeckContents["boards"] = { commander: {}, main: {}, side: {} };
  for (const row of d.deck_cards) {
    const board = boards[row.board as DeckBoard] ?? boards.main;
    board[row.card_id] = (board[row.card_id] ?? 0) + row.qty;
  }
  return { id: d.id, name: d.name, boards };
}
