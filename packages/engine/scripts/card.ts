// Why is a card (not) playable? Prints its text, what the engine could not read, and the verdict.
//   npx tsx scripts/card.ts "Banishing Light" "Impulse" ...
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { failedSentences, isSupportedCard, keywordsSupported, manaCostOf, parseCard } from "../src/index.js";

const cacheDir = path.resolve("../../mtg/.import-cache");
const file = fs.readdirSync(cacheDir).filter((f) => f.startsWith("oracle-cards") && f.endsWith(".jsonl.gz")).sort().pop()!;
const lines = zlib.gunzipSync(fs.readFileSync(path.join(cacheDir, file))).toString("utf8").split("\n").filter(Boolean);
const wanted = new Set(process.argv.slice(2).map((n) => n.toLowerCase()));

for (const line of lines) {
  const c = JSON.parse(line);
  if (!wanted.has(String(c.name).toLowerCase())) continue;
  const front = (c.type_line as string).split("—")[0].toLowerCase();
  const type = ["land", "creature", "planeswalker", "instant", "sorcery", "enchantment", "artifact"].find((w) => front.includes(w)) ?? "other";
  const def = {
    id: "x",
    name: c.name,
    type: type as never,
    cost: Math.round(c.cmc),
    power: /^\d+$/.test(c.power ?? "") ? Number(c.power) : undefined,
    toughness: /^\d+$/.test(c.toughness ?? "") ? Number(c.toughness) : undefined,
    loyalty: /^\d+$/.test(c.loyalty ?? "") ? Number(c.loyalty) : undefined,
    typeLine: c.type_line,
    manaCost: c.mana_cost ?? "",
    text: c.oracle_text ?? "",
    colors: c.colors ?? [],
    keywords: (c.keywords ?? []).map((k: string) => k.toLowerCase()),
  };
  const bad = failedSentences(def);
  console.log(`${isSupportedCard(def) ? "PLAYABLE  " : "not yet   "} ${def.name} ${def.manaCost} [${def.typeLine}]  keywords ok: ${keywordsSupported(def)}, cost ok: ${manaCostOf(def) !== null}`);
  if (!isSupportedCard(def)) console.log(`     unread lines: ${JSON.stringify(parseCard(def).unsupported)}${bad.length ? `\n     unread sentences: ${JSON.stringify(bad)}` : ""}`);
}
