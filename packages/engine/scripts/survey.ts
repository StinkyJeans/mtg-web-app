// Which missing pieces of card text keep the most cards unplayable? (all single-faced cards in the importer's cache)
//   npx tsx scripts/survey.ts [how many to list = 60]
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { failedSentences, isSupportedCard, keywordsSupported, parseCard } from "../src/index.js";
import type { CardDef } from "../src/index.js";

const TYPES = [["Land", "land"], ["Creature", "creature"], ["Planeswalker", "planeswalker"], ["Instant", "instant"], ["Sorcery", "sorcery"], ["Enchantment", "enchantment"], ["Artifact", "artifact"], ["Battle", "battle"]] as const;
const cacheDir = path.resolve("../../mtg/.import-cache");
const file = fs.readdirSync(cacheDir).filter((f) => f.startsWith("oracle-cards") && f.endsWith(".jsonl.gz")).sort().pop()!;
const lines = zlib.gunzipSync(fs.readFileSync(path.join(cacheDir, file))).toString("utf8").split("\n").filter(Boolean);
const limit = Number(process.argv[2] ?? 60);

const reasons = new Map<string, { cards: number; example: string }>();
let playable = 0;
let total = 0;
const add = (reason: string, name: string) => {
  const r = reasons.get(reason) ?? { cards: 0, example: name };
  r.cards++;
  reasons.set(reason, r);
};
for (const line of lines) {
  const c = JSON.parse(line);
  if (c.layout !== "normal" || c.card_faces) {
    add("two-faced / special layout", c.name);
    total++;
    continue;
  }
  total++;
  const front = (c.type_line as string).split("—")[0];
  const type = TYPES.find(([w]) => front.includes(w))?.[1] ?? "other";
  const def: CardDef = {
    id: "x",
    name: c.name,
    type,
    cost: Math.round(c.cmc),
    power: /^\d+$/.test(c.power ?? "") ? Number(c.power) : undefined,
    toughness: /^\d+$/.test(c.toughness ?? "") ? Number(c.toughness) : undefined,
      loyalty: /^\d+$/.test(c.loyalty ?? "") ? Number(c.loyalty) : undefined,
    typeLine: c.type_line,
    manaCost: c.mana_cost ?? "",
    text: c.oracle_text ?? "",
    keywords: (c.keywords ?? []).map((k: string) => k.toLowerCase()),
  };
  if (!["land", "creature", "artifact", "enchantment", "planeswalker", "instant", "sorcery"].includes(type)) {
    add(`TYPE ${type}`, c.name);
    continue;
  }
  if (isSupportedCard(def)) {
    playable++;
    continue;
  }
  if (type === "creature" && (def.power === undefined || def.toughness === undefined) && !parseCard(def).dynamicStats) add("creature with * power/toughness that is not counted from something known", c.name);
  for (const k of def.keywords!) if (!keywordsSupported({ ...def, keywords: [k] })) add(`KEYWORD ${k}`, c.name);
  for (const s of failedSentences(def)) add("TEXT " + s.replace(/\d+/g, "N").slice(0, 110), c.name);
}
console.log(`${playable} of ${total} cards are playable\n`);
for (const [r, v] of [...reasons].sort((a, b) => b[1].cards - a[1].cards).slice(0, limit)) console.log(String(v.cards).padStart(5), r, `   (e.g. ${v.example})`);
