// Re-check the dumped Marvel cards against the current parser.  tsx scripts/_msh.ts <msh.json> [list]
import fs from "node:fs";
import { failedSentences, isSupportedCard, keywordsSupported } from "../src/index.js";
import type { CardDef } from "../src/index.js";

const rows = JSON.parse(fs.readFileSync(process.argv[2] ?? "src/__tests__/fixtures/msh.json", "utf8"));
const def = (c: any): CardDef => ({
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
  keywords: (c.keywords ?? []).map((k: string) => k.toLowerCase()),
});
const bad: { name: string; why: string[] }[] = [];
for (const c of rows) {
  const d = def(c);
  if (isSupportedCard(d)) continue;
  const why = [...d.keywords!.filter((k) => !keywordsSupported({ ...d, keywords: [k] })).map((k) => "kw:" + k), ...failedSentences(d).map((s) => "text:" + s)];
  bad.push({ name: c.name, why });
}
console.log(`${rows.length - bad.length} playable, ${bad.length} not (of ${rows.length})`);
if (process.argv[3] === "list") for (const b of bad) console.log(`- ${b.name}: ${b.why.map((w) => w.slice(0, 90)).join(" | ")}`);
