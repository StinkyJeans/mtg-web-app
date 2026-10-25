import { parseCard } from "../src/index.js";
const def = { id: "x", name: "Test", type: "creature" as const, cost: 3, power: 1, toughness: 1, manaCost: "{2}{W}", typeLine: "Creature", text: process.argv[2] };
const p = parseCard(def);
console.log(JSON.stringify({ ok: p.ok, unsupported: p.unsupported, triggers: p.triggers.map((t) => ({ e: t.event, fx: t.effects, tg: t.targets })) }, null, 1).slice(0, 1500));
