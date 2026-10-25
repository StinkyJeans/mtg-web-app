// Which missing pieces keep the official decks from being playable?  Run from the mtg folder:
//   node scripts/decksurvey.mjs [maxMissing = 8]
// For every official deck with at most `maxMissing` unplayable cards it lists WHY each of those cards fails, and ranks the
// reasons by how many of those decks they block. Fixing a reason that appears in many nearly-ready decks pays off most.
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { failedSentences, isSupportedCard, keywordsSupported, parseCard } from "@mtg/engine";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY);
const maxMissing = Number(process.argv[2] ?? 8);
const onlyType = process.argv[3]; // e.g. Jumpstart

let nearQuery = db.from("official_decks_status").select("id,name,deck_type,code,unplayable").gt("unplayable", 0).lte("unplayable", maxMissing).limit(2000);
if (onlyType) nearQuery = nearQuery.eq("deck_type", onlyType);
const near = (await nearQuery).data;
console.log(`${near.length} official decks are missing between 1 and ${maxMissing} cards`);

const deckCards = new Map(); // deck -> card ids that are unplayable
const cardRows = new Map();
for (let i = 0; i < near.length; i += 25) {
  const batch = near.slice(i, i + 25);
  const r = await db
    .from("deck_cards")
    .select("deck_id, card_id, cards!inner(id,name,type,type_line,mana_cost,cost,oracle_text,keywords,power,toughness,colors,playable)")
    .in("deck_id", batch.map((d) => d.id))
    .in("board", ["main", "commander"])
    .eq("cards.playable", false);
  if (r.error) throw new Error(r.error.message);
  for (const row of r.data) {
    (deckCards.get(row.deck_id) ?? deckCards.set(row.deck_id, new Set()).get(row.deck_id)).add(row.card_id);
    cardRows.set(row.card_id, row.cards);
  }
}

const def = (c) => ({
  id: c.id,
  name: c.name,
  type: c.type,
  cost: c.cost,
  power: c.power ?? undefined,
  toughness: c.type === "planeswalker" ? undefined : (c.toughness ?? undefined),
  loyalty: c.type === "planeswalker" ? (c.toughness ?? undefined) : undefined,
  typeLine: c.type_line,
  manaCost: c.mana_cost ?? undefined,
  text: c.oracle_text ?? "",
  colors: c.colors ?? [],
  keywords: (c.keywords ?? []).map((k) => k.toLowerCase()),
});

/** Why a card is unplayable, as a few short reasons. */
function reasons(c) {
  if (!["land", "creature", "artifact", "enchantment", "planeswalker", "instant", "sorcery"].includes(c.type)) return [`type: ${c.type}`];
  const d = def(c);
  const out = [];
  for (const k of d.keywords) if (!keywordsSupported({ ...d, keywords: [k] })) out.push(`keyword: ${k}`);
  for (const s of failedSentences(d)) out.push(`text: ${s.replace(/\d+/g, "N").slice(0, 100)}`);
  if (out.length === 0 && !isSupportedCard(d)) {
    // every sentence reads on its own, but a whole line does not (an unusual cost, a trigger condition...): show the line
    const lines = parseCard(d).unsupported.map((l) => `line: ${l.replace(/\d+/g, "N").replace(/\{[^}]+\}/g, "{M}").slice(0, 100)}`);
    out.push(...(lines.length ? lines : ["(other: cost / loyalty / star power)"]));
  }
  return out;
}

const cardReasons = new Map([...cardRows].map(([id, c]) => [id, reasons(c)]));
const byReason = new Map(); // reason -> { decks:Set, cards:Set }
for (const [deck, cards] of deckCards) {
  for (const id of cards) {
    for (const r of cardReasons.get(id)) {
      const e = byReason.get(r) ?? { decks: new Set(), cards: new Set() };
      e.decks.add(deck);
      e.cards.add(id);
      byReason.set(r, e);
    }
  }
}
console.log("\nreasons ranked by how many nearly-ready decks they block:");
for (const [r, e] of [...byReason].sort((a, b) => b[1].decks.size - a[1].decks.size || b[1].cards.size - a[1].cards.size).slice(0, Number(process.env.TOP ?? 40))) {
  console.log(String(e.decks.size).padStart(4), "decks", String(e.cards.size).padStart(3), "cards  ", r, `   (e.g. ${cardRows.get([...e.cards][0]).name})`);
}

// decks that would be fully playable if a single reason were fixed
console.log("\ndecks that are blocked by ONE reason only (fix it and they open up):");
const single = new Map();
for (const [deck, cards] of deckCards) {
  const set = new Set([...cards].flatMap((id) => cardReasons.get(id)));
  if (set.size === 1) single.set([...set][0], [...(single.get([...set][0]) ?? []), near.find((d) => d.id === deck).name]);
}
for (const [r, names] of [...single].sort((a, b) => b[1].length - a[1].length)) console.log(String(names.length).padStart(3), "decks:", r, ` (${[...new Set(names)].slice(0, 3).join(", ")})`);

// A plan: pick the reason whose fix completes the most decks (counting partial progress as a tie-break), over and over.
{
  const deckReasons = new Map([...deckCards].map(([deck, cards]) => [deck, new Set([...cards].flatMap((id) => cardReasons.get(id)))]));
  const fixed = new Set();
  console.log("\nplan: fix these reasons in this order (each line: decks completed so far / decks closer):");
  let done = 0;
  for (let step = 1; step <= Number(process.env.STEPS ?? 25); step++) {
    let best = null;
    for (const r of byReason.keys()) {
      if (fixed.has(r)) continue;
      let completes = 0;
      let progress = 0;
      for (const set of deckReasons.values()) {
        if (![...set].includes(r)) continue;
        const left = [...set].filter((x) => !fixed.has(x));
        if (left.length === 1) completes++;
        progress += 1 / left.length;
      }
      if (!best || completes > best.completes || (completes === best.completes && progress > best.progress)) best = { r, completes, progress };
    }
    if (!best) break;
    fixed.add(best.r);
    done = [...deckReasons.values()].filter((set) => [...set].every((x) => fixed.has(x))).length;
    console.log(String(step).padStart(3), `${String(done).padStart(3)} decks complete`, " ", best.r, ` (e.g. ${cardRows.get([...byReason.get(best.r).cards][0]).name})`);
  }
}

// With DECKS=1: every deck with its missing cards and why each one fails.
if (process.env.DECKS === "1") {
  console.log("\nper deck:");
  for (const d of [...near].sort((a, b) => a.unplayable - b.unplayable)) {
    console.log(`\n${d.name} [${d.code}] — ${d.unplayable} missing`);
    for (const id of deckCards.get(d.id) ?? []) console.log(`   ${cardRows.get(id).name}: ${cardReasons.get(id).join(" | ")}`);
  }
}

if (process.env.OTHER === "1") {
  console.log("\ncards whose every line reads but that still are not playable:");
  for (const [id, rs] of cardReasons) {
    if (!rs.includes("(other: cost / loyalty / star power)")) continue;
    const c = cardRows.get(id);
    console.log(`  ${c.name} [${c.type}] cost ${c.mana_cost} p/t ${c.power}/${c.toughness} kw ${(c.keywords ?? []).join(",")} :: ${(c.oracle_text ?? "").replace(/\n/g, " / ").slice(0, 140)}`);
  }
}

// GOAL=50: choose the cheapest set of decks (fewest distinct missing cards in total) that makes GOAL decks playable, and list those cards.
if (process.env.GOAL) {
  const goal = Number(process.env.GOAL);
  const already = Number(process.env.ALREADY ?? 0);
  const need = new Map([...deckCards].map(([deck, cards]) => [deck, new Set(cards)]));
  const chosen = [];
  const union = new Set();
  const left = new Set(need.keys());
  while (chosen.length + already < goal && left.size) {
    let best = null;
    for (const d of left) {
      const extra = [...need.get(d)].filter((c) => !union.has(c)).length;
      if (!best || extra < best.extra) best = { d, extra };
    }
    left.delete(best.d);
    chosen.push(best.d);
    for (const c of need.get(best.d)) union.add(c);
    // any deck whose cards are now all covered comes for free
    for (const d of [...left]) if ([...need.get(d)].every((c) => union.has(c))) (left.delete(d), chosen.push(d));
  }
  console.log(`\nGOAL: ${chosen.length} decks need ${union.size} distinct cards fixed:`);
  for (const id of [...union].sort((a, b) => cardRows.get(a).name.localeCompare(cardRows.get(b).name))) {
    const c = cardRows.get(id);
    console.log(`${c.name} | ${c.mana_cost ?? ""} | ${c.type_line} | ${(c.oracle_text ?? "").replace(/\n/g, " / ")} :: ${cardReasons.get(id).join(" ## ")}`);
  }
}
