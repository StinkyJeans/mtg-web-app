import { unplayableCards, validateDeck } from "@mtg/engine";
import type { CardDef } from "@mtg/engine";
import { createClient } from "@/lib/supabase/client";
import { cardImageUrl, fetchCardsByIds } from "@/lib/cards";
import { forget, preloadImage, remember } from "@/lib/prefetch";

/** card id -> number of copies */
export type DeckEntries = Record<string, number>;

export interface Deck {
  id: string;
  name: string;
  entries: DeckEntries;
}

export interface OfficialDeck {
  id: string;
  name: string;
  deckType: string | null;
  code: string | null;
  releaseDate: string | null;
  /** Cards in the deck (main deck and commander) the game can't play yet. The deck can only be used when this is 0. */
  unplayable: number;
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

export const OFFICIAL_PAGE_SIZE = 13;

/** Deck types offered as a filter, most useful first. */
export const OFFICIAL_DECK_TYPES = [
  "Jumpstart",
  "Commander Deck",
  "Theme Deck",
  "Intro Pack",
  "Starter Deck",
  "Welcome Deck",
  "Planeswalker Deck",
  "Arena Starter Deck",
  "Duel Deck",
  "Event Deck",
  "Challenger Deck",
];

export async function listOfficialDecks(
  query: string,
  page: number,
  deckType = "",
  playableOnly = false,
): Promise<{ decks: OfficialDeck[]; total: number }> {
  const supabase = createClient();
  const text = query.trim().replace(/[%_\\]/g, "\\$&");
  const from = page * OFFICIAL_PAGE_SIZE;

  // Preferred: the database view that already knows how many unplayable cards each deck has (supabase/03-playable-decks.sql).
  let q = supabase.from("official_decks_status").select("id, name, deck_type, code, release_date, unplayable", { count: "exact" });
  if (deckType) q = q.eq("deck_type", deckType);
  if (text) q = q.ilike("name", `%${text}%`);
  if (playableOnly) q = q.eq("unplayable", 0);
  const viewed = await q
    .order("release_date", { ascending: false, nullsFirst: false })
    .order("name")
    .range(from, from + OFFICIAL_PAGE_SIZE - 1);
  if (!viewed.error) {
    const rows = viewed.data as { id: string; name: string; deck_type: string | null; code: string | null; release_date: string | null; unplayable: number }[];
    return {
      total: viewed.count ?? 0,
      decks: rows.map((d) => ({ id: d.id, name: d.name, deckType: d.deck_type, code: d.code, releaseDate: d.release_date, unplayable: d.unplayable })),
    };
  }
  // The view isn't installed yet: list the decks anyway, and count each deck's unplayable cards one by one.
  if (playableOnly) throw new Error("To show only playable decks, run supabase/03-playable-decks.sql once in the Supabase SQL editor.");

  let plain = supabase.from("decks").select("id, name, deck_type, code, release_date", { count: "exact" }).eq("official", true);
  if (deckType) plain = plain.eq("deck_type", deckType);
  if (text) plain = plain.ilike("name", `%${text}%`);
  const { data, count, error } = await plain
    .order("release_date", { ascending: false, nullsFirst: false })
    .order("name")
    .range(from, from + OFFICIAL_PAGE_SIZE - 1);
  if (error) throw new Error(error.message);
  const rows = data as { id: string; name: string; deck_type: string | null; code: string | null; release_date: string | null }[];
  const unplayable = await Promise.all(
    rows.map(async (d) => {
      const { count: n, error: countError } = await supabase
        .from("deck_cards")
        .select("card_id, cards!inner(playable)", { count: "exact", head: true })
        .eq("deck_id", d.id)
        .in("board", ["main", "commander"])
        .eq("cards.playable", false);
      if (countError) throw new Error(countError.message);
      return n ?? 0;
    }),
  );
  return {
    total: count ?? 0,
    decks: rows.map((d, i) => ({ id: d.id, name: d.name, deckType: d.deck_type, code: d.code, releaseDate: d.release_date, unplayable: unplayable[i] })),
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
  forget("deck:"); // what a preview remembered is about to be out of date
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
  forget("deck:");
  const { error } = await createClient().from("decks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Makes an editable copy of an official deck in the signed-in player's account. */
export async function copyOfficialDeck(officialId: string): Promise<string> {
  const source = await getDeck(officialId);
  return saveDeck({ name: source.name, entries: source.entries });
}

/**
 * Merges several decks into one new deck of your own and returns its id. Copies add up, so two decks
 * that both have 2 Forests give a deck with 4 Forests. Jumpstart packs are 20 cards: two make a 40-card deck.
 */
export async function combineDecks(sources: { id: string; name: string }[]): Promise<string> {
  const merged: DeckEntries = {};
  for (const source of sources) {
    const deck = await getDeck(source.id);
    for (const [card, qty] of Object.entries(deck.entries)) merged[card] = (merged[card] ?? 0) + qty;
  }
  return saveDeck({ name: sources.map((s) => s.name).join(" + "), entries: merged });
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

export type DeckPreviewData = { contents: DeckContents; defs: Record<string, CardDef> };

/**
 * Everything a deck preview shows: the deck's cards by board, and what each card is. Call it when the pointer rests on a
 * "view deck" button and the preview opens with the answer already in hand (the card pictures start downloading too).
 */
export function loadDeckPreview(id: string): Promise<DeckPreviewData> {
  return remember(`deck:${id}`, async () => {
    const contents = await getDeckContents(id);
    const ids = (["commander", "main", "side"] as const).flatMap((b) => Object.keys(contents.boards[b]));
    const defs = await fetchCardsByIds(ids);
    for (const def of Object.values(defs)) if (def.image) preloadImage(cardImageUrl(def.image));
    return { contents, defs };
  });
}
