// Prints the most common wordings of lines that contain a word:  npx tsx scripts/wording.ts kicker 25
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
const [word = "kicker", n = "25"] = process.argv.slice(2);
const cacheDir = path.resolve("../../mtg/.import-cache");
const file = fs.readdirSync(cacheDir).filter((f) => f.startsWith("oracle-cards") && f.endsWith(".jsonl.gz")).sort().pop()!;
const lines = zlib.gunzipSync(fs.readFileSync(path.join(cacheDir, file))).toString("utf8").split("\n").filter(Boolean);
const tally = new Map<string, { n: number; ex: string }>();
for (const l of lines) {
  const c = JSON.parse(l);
  if (c.layout !== "normal" || c.card_faces) continue;
  for (const line of (c.oracle_text ?? "").replace(/\([^)]*\)/g, "").split("\n").map((x: string) => x.trim()).filter(Boolean)) {
    if (!line.toLowerCase().includes(word.toLowerCase())) continue;
    const k = line.replaceAll(c.name, "~").replace(/\{[^}]+\}/g, "{M}").replace(/\d+/g, "N").toLowerCase();
    const e = tally.get(k) ?? { n: 0, ex: c.name };
    e.n++;
    tally.set(k, e);
  }
}
for (const [k, v] of [...tally].sort((a, b) => b[1].n - a[1].n).slice(0, Number(n))) console.log(String(v.n).padStart(4), k.slice(0, 150), ` (${v.ex})`);
