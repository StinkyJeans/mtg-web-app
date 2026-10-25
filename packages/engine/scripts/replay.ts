// Plays full games between two bots that read what each card does, picks a good one and writes it to a JSON file for the replay page.
// Run from packages/engine:   npx tsx scripts/replay.ts [firstSeed=1] [tries=40] [out=battle.json]
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import {
  applyAction,
  createGame,
  getCastable,
  getDamageAssignments,
  getForcedBlocks,
  getPossibleAttackers,
  getPossibleBlockers,
  isSupportedCard,
  legalTargets,
  parseCard,
  playerToAct,
  powerOf,
  suggestDamageAssignment,
  toughnessOf,
  MAX_HAND_SIZE,
} from "../src/index.js";
import type { Action, CardDef, GameEvent, GameState, PlayerId, TargetChoice } from "../src/index.js";

const [firstSeed = 1, tries = 40] = process.argv.slice(2, 4).map(Number);
const outFile = process.argv[4] ?? "battle.json";

// ───────── real cards ─────────
const cacheDir = path.resolve("../../mtg/.import-cache");
const file = fs.readdirSync(cacheDir).filter((f) => f.startsWith("oracle-cards") && f.endsWith(".jsonl.gz")).sort().pop()!;
const lines = zlib.gunzipSync(fs.readFileSync(path.join(cacheDir, file))).toString("utf8").split("\n").filter(Boolean);
const TYPES = [["Land", "land"], ["Creature", "creature"], ["Planeswalker", "planeswalker"], ["Instant", "instant"], ["Sorcery", "sorcery"], ["Enchantment", "enchantment"], ["Artifact", "artifact"]];
const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-");

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
const all = Object.values(defs);

type Rng = () => number;
function rngFrom(seed: number): Rng {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let x = Math.imul(t ^ (t >>> 15), t | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(rng: Rng, xs: T[]): T => xs[Math.floor(rng() * xs.length)];

/** A 40-card two-color deck, favoring creatures so there is plenty to see. */
function buildDeck(rng: Rng): string[] {
  const colors = ["W", "U", "B", "R", "G"].sort(() => rng() - 0.5).slice(0, 2);
  const fits = (d: CardDef) => (d.colors ?? []).every((c) => colors.includes(c));
  const creatures = all.filter((d) => d.type === "creature" && fits(d) && d.cost <= 5);
  const others = all.filter((d) => d.type !== "land" && d.type !== "creature" && fits(d));
  const basicOf: Record<string, string> = { W: "plains", U: "island", B: "swamp", R: "mountain", G: "forest" };
  const basics = colors.map((c) => basicOf[c]).filter((id) => defs[id]);
  const deck: string[] = [];
  const copies = new Map<string, number>();
  while (deck.length < 24) {
    const d = rng() < 0.7 ? pick(rng, creatures) : pick(rng, others);
    if ((copies.get(d.id) ?? 0) >= 3) continue;
    copies.set(d.id, (copies.get(d.id) ?? 0) + 1);
    deck.push(d.id);
  }
  while (deck.length < 40) deck.push(pick(rng, basics));
  return deck;
}

// ───────── what the bots see ─────────
type Perm = GameState["players"]["p1"]["battlefield"][number];
const nameOf = (s: GameState, defId: string) => s.cards[defId].name;
const textOf = (s: GameState, defId: string) => (s.cards[defId].text ?? "").toLowerCase();
const stateOf = (s: GameState, p: Perm) => {
  const d = s.cards[p.card.defId];
  return { iid: p.card.iid, name: d.name, type: d.type, power: d.type === "creature" ? powerOf(s, p) : null, toughness: d.type === "creature" ? toughnessOf(s, p) : null, tapped: p.tapped, damage: p.damage, sick: p.summoningSick, text: d.text ?? "", typeLine: d.typeLine ?? "", defId: d.id };
};
const snapshot = (s: GameState) => ({
  turn: s.turn,
  phase: s.phase,
  active: s.active,
  players: Object.fromEntries(
    (["p1", "p2"] as const).map((id) => {
      const pl = s.players[id];
      return [id, { life: pl.life, hand: pl.hand.length, library: pl.library.length, graveyard: pl.graveyard.map((c) => nameOf(s, c.defId)), board: pl.battlefield.map((p) => stateOf(s, p)) }];
    }),
  ),
});

const OPP = { p1: "p2", p2: "p1" } as const;
const log: string[] = [];
const think = (m: string) => log.push(m);

/** How much the bot wants to cast a card, from what its text says. */
function want(s: GameState, defId: string): { score: number; why: string } {
  const d = s.cards[defId];
  const t = textOf(s, defId);
  let score = 0;
  const why: string[] = [];
  if (d.type === "creature") { score += 6; why.push("a creature"); }
  if (d.type === "creature" && /\bhaste\b/.test(t)) { score += 3; why.push("haste, so it can attack right away"); }
  if (/flying/.test(t)) { score += 2; why.push("flying"); }
  if (/deathtouch|first strike|double strike|trample|lifelink/.test(t)) { score += 2; why.push("a strong combat keyword"); }
  if (/deals? \d+ damage|destroy target|exile target|gets -\d+\/-\d+/.test(t)) { score += 4; why.push("removal"); }
  if (/draw (a|two|three) cards?/.test(t)) { score += 2; why.push("draws cards"); }
  score += Math.min(d.cost, 6) * 0.3;
  return { score, why: why.join(", ") || "a spell" };
}

/** Picks targets from what the card's text says it does: hurt the enemy, or help a friend. */
function aimedTargets(s: GameState, specs: { kind: string }[], me: PlayerId, defId: string, rng: Rng): TargetChoice[] | null {
  const t = textOf(s, defId);
  const harmful = /deals? \d+ damage|destroy|exile|gets -\d|loses|tap target|can't block|sacrifice/.test(t) && !/gets \+\d/.test(t);
  const out: TargetChoice[] = [];
  for (const spec of specs) {
    const options = legalTargets(s, spec as never, me);
    if (options.length === 0) return null;
    const good = options.filter((o) => {
      if (o.kind === "player") return harmful ? o.id !== me : o.id === me;
      const mine = s.players[me].battlefield.some((p) => p.card.iid === o.iid);
      return harmful ? !mine : mine;
    });
    out.push(pick(rng, good.length ? good : options));
  }
  return out;
}

function choose(s: GameState, rng: Rng): { player: PlayerId; action: Action } {
  const player = playerToAct(s);
  const foe = OPP[player];
  const go = (action: Action) => ({ player, action });
  if (s.pendingPick) {
    const p = s.pendingPick;
    return go(p.optional && rng() < 0.3 ? { type: "pick" } : { type: "pick", iid: pick(rng, p.options) });
  }
  if (s.pendingChoice) return go({ type: "chooseTargets", targets: aimedTargets(s, s.pendingChoice.specs, s.pendingChoice.item.controller, s.pendingChoice.item.card.defId, rng) ?? [] });
  if (s.priority) return go({ type: "passPriority" });

  const permById = (iid: string) => [...s.players.p1.battlefield, ...s.players.p2.battlefield].find((p) => p.card.iid === iid)!;
  switch (s.phase) {
    case "mulligan":
      return go({ type: "keepHand", bottom: [] });
    case "cleanup": {
      const hand = s.players[player].hand;
      return go({ type: "discard", iids: hand.slice(0, hand.length - MAX_HAND_SIZE).map((c) => c.iid) });
    }
    case "damage":
      return go({ type: "assignDamage", assignments: getDamageAssignments(s).flatMap((d) => Object.entries(suggestDamageAssignment(s, d.attacker)).map(([blocker, amount]) => ({ attacker: d.attacker, blocker, amount }))) });
    case "blockers": {
      const attackers = s.combat?.attackers ?? [];
      const blocks = [...getForcedBlocks(s)];
      const used = new Set(blocks.map((b) => b.blocker));
      const life = s.players[player].life;
      const incoming = attackers.reduce((n, a) => n + powerOf(s, permById(a.attacker)), 0);
      for (const blocker of getPossibleBlockers(s)) {
        if (used.has(blocker)) continue;
        const b = permById(blocker);
        const options = attackers.map((a) => permById(a.attacker)).filter((a) => !blocks.some((x) => x.attacker === a.card.iid));
        const safe = options.find((a) => toughnessOf(s, b) > powerOf(s, a) && powerOf(s, b) >= toughnessOf(s, a));
        const wall = options.find((a) => toughnessOf(s, b) > powerOf(s, a));
        const trade = options.find((a) => powerOf(s, b) >= toughnessOf(s, a));
        const choice = safe ?? wall ?? (life <= incoming + 4 ? trade ?? options[0] : trade);
        if (choice) {
          blocks.push({ blocker, attacker: choice.card.iid });
          used.add(blocker);
          think(`${nameOf(s, b.card.defId)} blocks ${nameOf(s, choice.card.defId)}${safe ? " and wins the fight" : wall ? " and survives" : trade ? " to trade" : " to stay alive"}`);
        }
      }
      return go({ type: "declareBlockers", blocks });
    }
    case "attackers": {
      const possible = getPossibleAttackers(s);
      const theirs = s.players[foe].battlefield.filter((p) => s.cards[p.card.defId].type === "creature" && !p.tapped);
      const maxPower = theirs.reduce((n, p) => Math.max(n, powerOf(s, p)), 0);
      const mine = (iid: string) => s.players[player].battlefield.find((p) => p.card.iid === iid)!;
      const forced = possible.filter((id) => parseCard(s.cards[mine(id).card.defId]).mustAttack);
      const can = [
        ...new Set([
          ...possible.filter((id) => {
            const me = mine(id);
            const flies = /flying/.test(textOf(s, me.card.defId)) && !theirs.some((p) => /flying|reach/.test(textOf(s, p.card.defId)));
            return theirs.length === 0 || flies || toughnessOf(s, me) > maxPower || s.players[foe].life <= possible.length * 3 || theirs.length < possible.length;
          }),
          ...forced,
        ]),
      ];
      if (can.length > 0) {
        think(`attacks with ${can.map((id) => nameOf(s, mine(id).card.defId)).join(", ")}`);
        return go({ type: "declareAttackers", attackers: can });
      }
      return go({ type: "passPhase" });
    }
    default: {
      const hand = s.players[player].hand;
      const land = hand.find((c) => s.cards[c.defId].type === "land");
      if (land && s.players[player].landsPlayedThisTurn < 1) {
        think(`plays ${nameOf(s, land.defId)}`);
        return go({ type: "playLand", iid: land.iid });
      }
      const zoneCard = (iid: string) => [...hand, ...s.players[player].graveyard].find((h) => h.iid === iid);
      const casts = getCastable(s, player)
        .map((c) => ({ c, card: zoneCard(c.iid) }))
        .filter((x) => x.card)
        .map((x) => ({ ...x, ...want(s, x.card!.defId) }))
        .sort((a, b) => b.score - a.score);
      for (const { c, card, why } of casts) {
        if (c.modal) continue;
        const def = s.cards[card!.defId];
        const targets = aimedTargets(s, c.specs, player, card!.defId, rng);
        if (!targets) continue;
        think(`casts ${def.name} (${why})`);
        return go(
          def.type === "creature"
            ? ({ type: "castCreature", iid: c.iid } as Action)
            : ({ type: "castSpell", iid: c.iid, targets, ...(c.maxX !== undefined ? { x: c.maxX } : {}), ...(c.zone ? { from: c.zone } : {}) } as Action),
        );
      }
      return go({ type: "passPhase" });
    }
  }
}

// ───────── play games, keep the most exciting one ─────────
type Step = { n: number; who: PlayerId; did: string; thoughts: string[]; events: GameEvent[]; after: ReturnType<typeof snapshot> };
function play(seed: number) {
  const rng = rngFrom(seed);
  const decks = { p1: buildDeck(rng), p2: buildDeck(rng) };
  let state = createGame(decks, seed * 7919, defs, { startingPlayer: rng() < 0.5 ? "p1" : "p2" });
  const steps: Step[] = [{ n: 0, who: "p1", did: "start", thoughts: [], events: [], after: snapshot(state) }];
  let failed = 0;
  for (let i = 0; i < 2500 && !state.winner; i++) {
    log.length = 0;
    const { player, action } = choose(state, rng);
    if (process.env.DBG && i < 14) console.log(i, state.phase, player, JSON.stringify(action), "hand:", state.players[player].hand.map((h) => state.cards[h.defId].type).join(","));
    const r = applyAction(state, player, action);
    if (!r.ok) {
      if (process.env.DBG) console.log("refused:", JSON.stringify(action), r.error);
      if (++failed > 20) return null;
      const safe: Action = state.priority ? { type: "passPriority" } : state.phase === "blockers" ? { type: "declareBlockers", blocks: getForcedBlocks(state) } : { type: "passPhase" };
      const r2 = applyAction(state, playerToAct(state), safe);
      if (r2.ok) state = r2.state;
      else if (state.pendingPick || state.pendingChoice) return null;
      continue;
    }
    failed = 0;
    state = r.state;
    steps.push({ n: steps.length, who: player, did: action.type, thoughts: [...log], events: r.events, after: snapshot(state) });
  }
  return state.winner ? { seed, steps, state } : null;
}

let best: ReturnType<typeof play> = null;
let bestScore = -Infinity;
for (let k = 0; k < tries; k++) {
  let g: ReturnType<typeof play> = null;
  try { g = play(firstSeed + k); } catch { g = null; }
  if (!g) continue;
  const hits = g.steps.flatMap((x) => x.events).filter((e) => e.type === "combatDamage").length;
  const deaths = g.steps.flatMap((x) => x.events).filter((e) => e.type === "creatureDied").length;
  const score = hits + deaths - Math.abs(g.state.turn - 10) * 1.5;
  if (g.state.winner && score > bestScore) { best = g; bestScore = score; }
}
if (!best) {
  console.log("no game finished");
  process.exit(1);
}
console.log(`seed ${best.seed}: ${best.steps.length} steps, ${best.state.turn} turns, winner ${best.state.winner}, score ${bestScore.toFixed(1)}`);
fs.writeFileSync(
  outFile,
  JSON.stringify({ seed: best.seed, winner: best.state.winner, turns: best.state.turn, steps: best.steps, cards: Object.fromEntries(Object.values(best.state.cards).map((c) => [c.id, { name: c.name, text: c.text ?? "", typeLine: c.typeLine ?? "" }])) }),
);
