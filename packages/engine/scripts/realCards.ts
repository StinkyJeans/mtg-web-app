// Loads the real cards the engine can play from the importer's cache (mtg/.import-cache).
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { isSupportedCard } from "../src/index.js";
import type { CardDef } from "../src/index.js";

const TYPES = [["Land", "land"], ["Creature", "creature"], ["Planeswalker", "planeswalker"], ["Instant", "instant"], ["Sorcery", "sorcery"], ["Enchantment", "enchantment"], ["Artifact", "artifact"], ["Battle", "battle"]] as const;
const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export function loadRealCards(): { defs: Record<string, CardDef>; cacheSize: number } {
  const cacheDir = path.resolve("../../mtg/.import-cache");
  const file = fs.readdirSync(cacheDir).filter((f) => f.startsWith("oracle-cards") && f.endsWith(".jsonl.gz")).sort().pop()!;
  const lines = zlib.gunzipSync(fs.readFileSync(path.join(cacheDir, file))).toString("utf8").split("\n").filter(Boolean);
  const defs: Record<string, CardDef> = {};
  for (const line of lines) {
    const c = JSON.parse(line);
    if (c.layout !== "normal" || c.card_faces) continue;
    const front = (c.type_line as string).split("—")[0];
    const type = TYPES.find(([w]) => front.includes(w))?.[1] ?? "other";
    const def: CardDef = {
      id: slug(c.name),
      name: c.name,
      type,
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
    if (["land", "creature", "artifact", "enchantment", "planeswalker", "instant", "sorcery"].includes(type) && isSupportedCard(def)) defs[def.id] = def;
  }
  return { defs, cacheSize: lines.length };
}
