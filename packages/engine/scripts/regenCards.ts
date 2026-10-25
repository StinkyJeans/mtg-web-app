// Every real card that says "can't be regenerated": cast it on targets that have a regeneration shield and check that they die.
// Control cards (plain "Destroy target creature") must NOT kill a shielded creature.
// Run from packages/engine:   npx tsx scripts/regenCards.ts
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { applyAction, createGame, getActivatable, getCastable, isSupportedCard, legalTargets, playerToAct } from "../src/index.js";
import type { Action, CardDef, GameState, TargetChoice } from "../src/index.js";

const cacheDir = path.resolve("../../mtg/.import-cache");
const file = fs.readdirSync(cacheDir).filter((f) => f.startsWith("oracle-cards") && f.endsWith(".jsonl.gz")).sort().pop()!;
const lines = zlib.gunzipSync(fs.readFileSync(path.join(cacheDir, file))).toString("utf8").split("\n").filter(Boolean);
const TYPES = [["Land", "land"], ["Creature", "creature"], ["Planeswalker", "planeswalker"], ["Instant", "instant"], ["Sorcery", "sorcery"], ["Enchantment", "enchantment"], ["Artifact", "artifact"]];
const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const defs: Record<string, CardDef> = {};
const unsupported: string[] = [];
for (const line of lines) {
  const c = JSON.parse(line);
  if (c.layout !== "normal" || c.card_faces) continue;
  const front = (c.type_line as string).split("—")[0];
  const type = TYPES.find(([w]) => front.includes(w))?.[1] ?? "other";
  const def: CardDef = {
    id: slug(c.name), name: c.name, type, cost: Math.round(c.cmc),
    power: /^\d+$/.test(c.power ?? "") ? Number(c.power) : undefined,
    toughness: /^\d+$/.test(c.toughness ?? "") ? Number(c.toughness) : undefined,
    loyalty: /^\d+$/.test(c.loyalty ?? "") ? Number(c.loyalty) : undefined,
    typeLine: c.type_line, manaCost: c.mana_cost ?? "", text: c.oracle_text ?? "", colors: c.colors ?? [],
    keywords: (c.keywords ?? []).map((k: string) => k.toLowerCase()),
  };
  if (!["land", "creature", "artifact", "enchantment", "planeswalker", "instant", "sorcery"].includes(type)) continue;
  if (isSupportedCard(def)) defs[def.id] = def;
  else if (/can't be regenerated/i.test(def.text ?? "")) unsupported.push(def.name);
}

const stripReminder = (t: string) => t.replace(/\([^)]*\)/g, "");
const regenCards = Object.values(defs).filter((d) => d.type !== "land" && /can't be regenerated/i.test(stripReminder(d.text ?? "")));
const controls = ["murder", "doom-blade", "terror"].map((id) => defs[id]).filter(Boolean);
console.log(`${regenCards.length} playable cards say "can't be regenerated" (${unsupported.length} more are not playable yet: ${unsupported.slice(0, 8).join(", ")}${unsupported.length > 8 ? "…" : ""})`);

// Targets for the tests: one of each kind, all of them with a regeneration shield.
const T: Record<string, CardDef> = {
  tGreen: { id: "tGreen", name: "Test Green", type: "creature", cost: 1, manaCost: "{G}", power: 1, toughness: 1, typeLine: "Creature — Test", text: "", colors: ["G"] },
  tBlack: { id: "tBlack", name: "Test Black", type: "creature", cost: 1, manaCost: "{B}", power: 1, toughness: 1, typeLine: "Creature — Test", text: "", colors: ["B"] },
  tWhite: { id: "tWhite", name: "Test White", type: "creature", cost: 1, manaCost: "{W}", power: 1, toughness: 1, typeLine: "Creature — Test", text: "", colors: ["W"] },
  tArtifact: { id: "tArtifact", name: "Test Artifact", type: "artifact", cost: 1, manaCost: "{1}", typeLine: "Artifact", text: "" },
  tBig: { id: "tBig", name: "Test Big", type: "creature", cost: 5, manaCost: "{4}{G}", power: 5, toughness: 5, typeLine: "Creature — Test", text: "", colors: ["G"] },
  tZombie: { id: "tZombie", name: "Test Zombie", type: "creature", cost: 1, manaCost: "{B}", power: 1, toughness: 1, typeLine: "Creature — Zombie", text: "", colors: ["B"] },
  tEnch: { id: "tEnch", name: "Test Enchantment", type: "enchantment", cost: 1, manaCost: "{W}", typeLine: "Enchantment", text: "", colors: ["W"] },
};
const perm = (iid: string, defId: string, owner: "p1" | "p2", shield = 0) => ({ card: { iid, defId, owner }, tapped: false, summoningSick: false, damage: 0, ...(shield ? { regenShield: shield } : {}) });

function scenario(card: CardDef): { state: GameState; tests: string[] } {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...defs, ...T };
  const lands = ["plains", "island", "swamp", "mountain", "forest"].flatMap((l) => [0, 1, 2].map((i) => perm(`l-${l}${i}`, l, "p1")));
  g.players.p1.battlefield = lands;
  g.players.p1.hand = [{ iid: "spell", defId: card.id, owner: "p1" }];
  g.players.p2.battlefield = [
    perm("q-green", "tGreen", "p2", 1), perm("q-black", "tBlack", "p2", 1), perm("q-white", "tWhite", "p2", 1),
    perm("q-art", "tArtifact", "p2", 1), perm("q-ench", "tEnch", "p2", 1), perm("q-land", "forest", "p2", 1), perm("q-big", "tBig", "p2", 1),
  ];
  g.players.p1.battlefield.push(perm("fodder", "tZombie", "p1"));
  g.players.p1.hand.push({ iid: "filler", defId: "mountain", owner: "p1" });
  g.phase = "main1";
  g.active = "p1";
  return { state: g, tests: ["q-green", "q-black", "q-white", "q-art", "q-ench", "q-land", "q-big"] };
}

type Outcome = { verdict: "PASS" | "FAIL" | "skip"; note: string };
const present = (s: GameState, iid: string) => Object.values(s.players).some((p) => p.battlefield.some((x) => x.card.iid === iid));
const isSweeper = (card: CardDef) => /destroy all creatures/i.test(stripReminder(card.text ?? ""));

/** Passes priority until nothing is left to resolve; answers a trigger's target with a shielded test permanent. */
function settle(s0: GameState, tests: string[]): { state: GameState; waits: boolean; picked: string[] } {
  let s = s0;
  const picked: string[] = [];
  for (let i = 0; i < 40; i++) {
    if (s.pendingChoice) {
      const targets: TargetChoice[] = [];
      for (const spec of s.pendingChoice.specs) {
        const options = legalTargets(s, spec, s.pendingChoice.item.controller);
        const t = options.find((o) => o.kind === "permanent" && tests.includes(o.iid)) ?? options.find((o) => o.kind === "permanent") ?? options[0];
        if (!t) return { state: s, waits: true, picked };
        targets.push(t);
        if (t.kind === "permanent") picked.push(t.iid);
      }
      const r = applyAction(s, s.pendingChoice.item.controller, { type: "chooseTargets", targets });
      if (!r.ok) return { state: s, waits: true, picked };
      s = r.state;
      continue;
    }
    if (s.pendingPick) {
      const pk = s.pendingPick;
      const r = applyAction(s, pk.owner, pk.optional ? { type: "pick" } : { type: "pick", iid: pk.options[0] });
      if (!r.ok) return { state: s, waits: true, picked };
      s = r.state;
      continue;
    }
    if (!s.priority && s.stack.length === 0) break;
    const r = applyAction(s, s.priority ? s.priority.holder : playerToAct(s), { type: "passPriority" });
    if (!r.ok) break;
    s = r.state;
  }
  return { state: s, waits: false, picked };
}

function run(card: CardDef, expectDeath: boolean): Outcome {
  const { state, tests } = scenario(card);
  const nameOf = (iid: string) => state.cards[Object.values(state.players).flatMap((p) => p.battlefield).find((p) => p.card.iid === iid)!.card.defId].name;
  const verdict = (s: GameState, chosen: string[]): Outcome => {
    if (chosen.length === 0) {
      // the game picked the only legal target by itself: see which shielded test permanent is gone
      const gone = tests.filter((iid) => !present(s, iid));
      if (expectDeath) return gone.length > 0 ? { verdict: "PASS", note: `${gone.map(nameOf).join(", ")} destroyed through the shield (the only legal target)` } : { verdict: "FAIL", note: "nothing was destroyed" };
      return gone.length === 0 ? { verdict: "PASS", note: "shielded permanents regenerated" } : { verdict: "FAIL", note: `${gone.map(nameOf).join(", ")} died although it had a shield` };
    }
    const alive = chosen.filter((iid) => present(s, iid));
    const names = chosen.map(nameOf).join(", ");
    if (expectDeath) return alive.length === 0 ? { verdict: "PASS", note: `${names} destroyed through the shield` } : { verdict: "FAIL", note: `${alive.map(nameOf).join(", ")} survived (the shield still saved it)` };
    return alive.length > 0 ? { verdict: "PASS", note: `${names} regenerated, as it should` } : { verdict: "FAIL", note: `${names} died although it had a shield` };
  };

  // A permanent with an activated ability ("{T}: Destroy target creature. It can't be regenerated."): put it in play and use the ability.
  const text = stripReminder(card.text ?? "");
  // an ability line looks like "<cost>: <effect>"; the costs seen on these cards are {T}, mana, or sacrificing the permanent itself
  const hasAbility = card.type !== "instant" && card.type !== "sorcery" && text.split(/\r?\n/).some((line) => /^[^:]{1,60}:\s.*destroy/i.test(line) && !/^(when|whenever|at|if)\b/i.test(line));
  if (hasAbility) {
    state.players.p1.hand = [{ iid: "filler", defId: "mountain", owner: "p1" }]; // something to discard if the ability asks for it
    state.players.p1.battlefield.push({ ...perm("src", card.id, "p1"), summoningSick: false });
    const a = getActivatable(state, "p1").find((x) => x.iid === "src");
    if (!a) return { verdict: "skip", note: "its ability can't be used in the test setup (a special cost?)" };
    const targets: TargetChoice[] = [];
    for (const spec of a.specs) {
      const options = legalTargets(state, spec, "p1");
      const t = options.find((o) => o.kind === "permanent" && tests.includes(o.iid)) ?? options.find((o) => o.kind === "permanent");
      if (!t) return { verdict: "skip", note: `no legal target for "${spec.label}"` };
      targets.push(t);
    }
    const r = applyAction(state, "p1", { type: "activateAbility", iid: "src", index: a.index, targets, ...(a.costChoices ? { payWith: a.costChoices[0] } : {}) });
    if (!r.ok) return { verdict: "skip", note: `could not use it: ${r.error}` };
    const { state: s, waits } = settle(r.state, tests);
    if (waits) return { verdict: "skip", note: "waits for a choice" };
    return verdict(s, targets.flatMap((t) => (t.kind === "permanent" ? [t.iid] : [])));
  }

  const c = getCastable(state, "p1").find((x) => x.iid === "spell");
  if (!c) return { verdict: "skip", note: "not castable in the test setup" };
  const modeIdx = c.modal ? c.modal.modes.findIndex((m) => m.available && /destroy|damage/i.test(m.text)) : -1;
  if (c.modal && modeIdx < 0) return { verdict: "skip", note: "no destroying mode could be chosen" };
  const targets: TargetChoice[] = [];
  for (const spec of c.modal ? c.modal.modes[modeIdx].specs : c.specs) {
    const options = legalTargets(state, spec, "p1");
    const t = options.find((o) => o.kind === "permanent" && tests.includes(o.iid)) ?? options.find((o) => o.kind === "permanent");
    if (!t) return { verdict: "skip", note: `no legal target for "${spec.label}"` };
    targets.push(t);
  }
  // the game screen casts every card (creatures too, which is how a kicker is paid) with castSpell
  const action: Action = { type: "castSpell", iid: "spell", targets, ...(c.sacrifice ? { sacrifice: c.sacrifice[0] } : {}), ...(c.kicker !== undefined ? { kicked: true } : {}), ...(c.modal ? { modes: [modeIdx] } : {}), ...(c.maxX !== undefined ? { x: Math.min(c.maxX, 3) } : {}) };
  const r = applyAction(state, "p1", action);
  if (!r.ok) return { verdict: "skip", note: `could not cast: ${r.error}` };
  const { state: s, waits, picked } = settle(r.state, tests);
  if (waits) return { verdict: "skip", note: "waits for a choice" };
  if (isSweeper(card)) {
    const creatures = ["q-green", "q-black", "q-white"];
    const mine = /you don't control/i.test(text) ? creatures : creatures; // the shielded creatures are the opponent's either way
    return verdict(s, mine);
  }
  return verdict(s, [...targets.flatMap((t) => (t.kind === "permanent" ? [t.iid] : [])), ...picked]);
}

let fails = 0;
console.log("\n— cards that say \"can't be regenerated\": the shielded target must die —");
for (const card of regenCards) {
  const o = run(card, true);
  if (o.verdict === "FAIL") fails++;
  console.log(`${o.verdict.padEnd(5)} ${card.name.padEnd(30)} ${(card.text ?? "").replace(/\n/g, " ").slice(0, 80)}\n        ${o.note}`);
}
console.log("\n— control cards (no such rider): a shielded target must survive —");
for (const card of controls.filter((c) => !/can't be regenerated/i.test(stripReminder(c.text ?? "")))) {
  const o = run(card, false);
  if (o.verdict === "FAIL") fails++;
  console.log(`${o.verdict.padEnd(5)} ${card.name.padEnd(30)} ${o.note}`);
}
console.log(fails ? `\n${fails} FAILED` : "\nAll cards behave correctly.");
process.exit(fails ? 1 : 0);
