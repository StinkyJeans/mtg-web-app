// Galerider Silver (1/1) attacks, its controller casts Giant Growth (+3/+3), the opponent has Terashi's Verdict
// ("Destroy target attacking creature with power 3 or less"). What may the opponent do, and when?
// Run from packages/engine:   npx tsx scripts/verdictCheck.ts
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { applyAction, createGame, getCastable, isSupportedCard, legalTargets, powerOf, toughnessOf } from "../src/index.js";
import type { CardDef, GameState } from "../src/index.js";

const cacheDir = path.resolve("../../mtg/.import-cache");
const file = fs.readdirSync(cacheDir).filter((f) => f.startsWith("oracle-cards") && f.endsWith(".jsonl.gz")).sort().pop()!;
const lines = zlib.gunzipSync(fs.readFileSync(path.join(cacheDir, file))).toString("utf8").split("\n").filter(Boolean);
const TYPES = [["Land", "land"], ["Creature", "creature"], ["Instant", "instant"], ["Sorcery", "sorcery"], ["Enchantment", "enchantment"], ["Artifact", "artifact"]];
const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const defs: Record<string, CardDef> = {};
for (const line of lines) {
  const c = JSON.parse(line);
  if (c.layout !== "normal" || c.card_faces) continue;
  const front = (c.type_line as string).split("—")[0];
  const type = TYPES.find(([w]) => front.includes(w))?.[1] ?? "other";
  const def: CardDef = {
    id: slug(c.name), name: c.name, type, cost: Math.round(c.cmc),
    power: /^\d+$/.test(c.power ?? "") ? Number(c.power) : undefined,
    toughness: /^\d+$/.test(c.toughness ?? "") ? Number(c.toughness) : undefined,
    typeLine: c.type_line, manaCost: c.mana_cost ?? "", text: c.oracle_text ?? "", colors: c.colors ?? [],
    keywords: (c.keywords ?? []).map((k: string) => k.toLowerCase()),
  };
  if (["land", "creature", "enchantment", "artifact", "instant", "sorcery"].includes(type) && isSupportedCard(def)) defs[def.id] = def;
}
const need = ["galerider-sliver", "giant-growth", "terashi-s-verdict"];
for (const id of need) if (!defs[id]) throw new Error(`${id} is not playable in the engine`);
console.log("Terashi's Verdict reads:", defs["terashi-s-verdict"].text);

const perm = (iid: string, defId: string, owner: "p1" | "p2") => ({ card: { iid, defId, owner }, tapped: false, summoningSick: false, damage: 0 });
const g = createGame({ p1: Array(40).fill("forest"), p2: Array(40).fill("plains") }, 1, defs);
g.cards = { ...defs };
g.players.p1.battlefield = [perm("f1", "forest", "p1"), perm("f2", "forest", "p1"), perm("sliver", "galerider-sliver", "p1")];
g.players.p1.hand = [{ iid: "growth", defId: "giant-growth", owner: "p1" }];
g.players.p2.battlefield = [perm("w1", "plains", "p2"), perm("w2", "plains", "p2"), perm("w3", "plains", "p2"), perm("w4", "plains", "p2")];
g.players.p2.hand = [{ iid: "verdict", defId: "terashi-s-verdict", owner: "p2" }, { iid: "verdict2", defId: "terashi-s-verdict", owner: "p2" }];
g.phase = "attackers";
g.active = "p1";

const step = (s: GameState, who: "p1" | "p2", a: Parameters<typeof applyAction>[2]) => {
  const r = applyAction(s, who, a);
  if (!r.ok) throw new Error(`${who} ${a.type}: ${r.error}`);
  return r.state;
};
const sliver = (s: GameState) => Object.values(s.players).flatMap((p) => p.battlefield).find((p) => p.card.iid === "sliver");
const show = (s: GameState, label: string) => {
  const p = sliver(s);
  console.log(`${label}: Galerider ${p ? `${powerOf(s, p)}/${toughnessOf(s, p)} on the battlefield` : "is gone"}; stack: ${s.stack.map((i) => (i.kind === "spell" ? s.cards[i.card.defId].name : i.sourceName)).join(", ") || "empty"}`);
};
const verdictTargets = (s: GameState) => {
  const c = getCastable(s, "p2").find((x) => x.iid === "verdict");
  if (!c) return "not castable";
  const t = c.specs.flatMap((sp) => legalTargets(s, sp, "p2")).map((x) => (x.kind === "permanent" ? x.iid : x.kind));
  return t.length ? `can target: ${t.join(", ")}` : "castable, but has no legal target";
};

let s = step(g, "p1", { type: "declareAttackers", attackers: ["sliver"] });
show(s, "1. Galerider attacks");
s = step(s, "p1", { type: "castSpell", iid: "growth", targets: [{ kind: "permanent", iid: "sliver" }] });
show(s, "2. you cast Giant Growth on it");
console.log("   holder of priority:", s.priority?.holder, "| Verdict now:", verdictTargets(s));

// A) the opponent answers while Giant Growth is still on the stack (Galerider is still 1/1, so Verdict is legal)
{
  let a = structuredClone(s);
  a = step(a, "p2", { type: "castSpell", iid: "verdict", targets: [{ kind: "permanent", iid: "sliver" }] });
  show(a, "   [A] opponent casts Verdict in response, before Giant Growth resolved");
  for (let i = 0; i < 8 && (a.priority || a.stack.length) && !a.pendingPick && !a.pendingChoice; i++) a = step(a, a.priority!.holder, { type: "passPriority" });
  show(a, "   [A] everything resolved");
  console.log("   [A] your graveyard:", a.players.p1.graveyard.map((c) => a.cards[c.defId].name).join(", "), "| opponent graveyard:", a.players.p2.graveyard.map((c) => a.cards[c.defId].name).join(", "));
}

// B) Giant Growth resolves first, then the opponent tries Verdict on the 4/4
{
  let b = structuredClone(s);
  for (let i = 0; i < 6 && b.stack.length > 0; i++) b = step(b, b.priority!.holder, { type: "passPriority" });
  show(b, "3. [B] Giant Growth has resolved");
  console.log("   [B] holder:", b.priority?.holder, "| Verdict now:", verdictTargets(b));
  const r = applyAction(b, "p2", { type: "castSpell", iid: "verdict", targets: [{ kind: "permanent", iid: "sliver" }] });
  console.log("   [B] opponent casts Verdict on the 4/4:", r.ok ? "ALLOWED (this would be a bug)" : `refused: ${r.error}`);
}
