import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, CARDS, castCostOf, createGame, getActivatable, isSupportedCard, powerOf, toughnessOf } from "../index.js";
import type { Action, CardDef, CardInstance, GameState, PlayerId } from "../index.js";

const creature = (id: string, power: number, toughness: number, text = "", extra: Partial<CardDef> = {}): CardDef => ({ id, name: id, type: "creature", cost: 1, manaCost: "{R}", power, toughness, typeLine: "Creature — Test", text, ...extra });
const spell = (id: string, type: "instant" | "sorcery", text: string, manaCost = "{R}", extra: Partial<CardDef> = {}): CardDef => ({ id, name: id, type, cost: 1, manaCost, text, ...extra });
const ench = (id: string, text: string): CardDef => ({ id, name: id, type: "enchantment", cost: 1, manaCost: "{R}", typeLine: "Enchantment", text });
const goblin = (id: string, text = "", extra: Partial<CardDef> = {}) => creature(id, 1, 1, text, { typeLine: "Creature — Goblin", ...extra });

const DEFS: Record<string, CardDef> = {
  ...CARDS,
  krenko: goblin("krenko", "{T}: Create X 1/1 red Goblin creature tokens, where X is the number of Goblins you control."),
  gob: goblin("gob"),
  brightmare: creature("brightmare", 2, 2, "When this creature enters, tap up to one target creature. You gain life equal to that creature's power."),
  takeheart: spell("takeheart", "instant", "Target creature gets +2/+2 until end of turn. You gain 1 life for each attacking creature you control."),
  server: creature("server", 1, 1, "When this creature enters, you gain 1 life for each other creature you control."),
  falconer: creature("falconer", 2, 2, "Whenever this creature attacks, create a 1/1 white Bird creature token with flying that's tapped and attacking."),
  cloudshift: spell("cloudshift", "instant", "Exile target creature you control, then return that card to the battlefield under your control."),
  lasher: creature("lasher", 1, 1, "When this creature enters, put a +1/+1 counter on it."),
  warchief: goblin("warchief", "Goblin spells you cast cost {1} less to cast.\nGoblins you control have haste."),
  naiad: creature("naiad", 1, 1, "During turns other than yours, spells you cast cost {1} less to cast."),
  discovery: spell("discovery", "instant", "This spell costs {1} less to cast for each spell your opponents have cast this turn.\nDraw a card.", "{1}{U}"),
  path: spell("path", "instant", "Exile target creature. Its controller may search their library for a basic land card, put that card onto the battlefield tapped, then shuffle.", "{R}"),
  scene: spell("scene", "sorcery", "Exile target nonland permanent. Its controller creates a 1/1 white Soldier creature token."),
  lore: spell("lore", "sorcery", "Draw four cards, then discard three cards at random."),
  seismic: creature("seismic", 3, 3, "When this creature enters, creatures without flying can't block this turn."),
  quake: spell("quake", "instant", "This spell deals X damage to each creature without flying and each planeswalker.", "{X}{R}"),
  startling: spell("startling", "instant", "Until end of turn, target creature becomes a blue Serpent with base power and toughness 4/4."),
  merfolk: creature("merfolk", 1, 1, "Defender\n{1}: This creature loses defender and becomes a Human until end of turn.", { keywords: ["defender"] }),
  lynx: creature("lynx", 2, 2, "During your turn, this creature has first strike."),
  oriflamme: ench("oriflamme", "Attacking creatures you control get +1/+0."),
  goon: goblin("goon", "This creature can't attack unless you control more creatures than defending player."),
  mare: creature("mare", 2, 2, "This creature can't be blocked by red creatures.\nWhen this creature enters or becomes the target of a spell or ability an opponent controls, you gain 3 life.", { colors: ["W"] }),
  redbear: creature("redbear", 2, 2, "", { colors: ["R"] }),
  speaker: creature("speaker", 1, 1, "{T}: Create a 4/4 white Angel creature token with flying. Activate only if you have at least 7 life more than your starting life total and only as a sorcery."),
  prophecy: spell("prophecy", "instant", "This spell deals 3 damage to target creature. You may put a card from your hand on the bottom of your library. If you do, draw a card."),
  hope: spell("hope", "instant", "Return target creature to its owner's hand. If its mana value was 3 or less, scry 1.", "{R}"),
  valkyrie: creature("valkyrie", 2, 2, "Whenever another Angel or Cleric you control enters, you gain life equal to that creature's toughness.", { typeLine: "Creature — Angel Cleric" }),
  cleric: creature("cleric", 1, 3, "", { typeLine: "Creature — Cleric" }),
  ardoz: goblin("ardoz", "Whenever this creature or another creature you control enters, that creature gets +2/+0 until end of turn."),
  sanctuary: ench("sanctuary", "Prevent all noncombat damage that would be dealt to you and creatures you control.\nWhenever a nontoken creature you control enters, create a 2/2 white Unicorn creature token."),
  phalanx: spell("phalanx", "instant", "Target creature you control gets +2/+1 until end of turn. Each other creature you control gets +1/+1 until end of turn."),
  tenacity: spell("tenacity", "instant", "Creatures you control get +1/+1 and gain lifelink until end of turn. Untap those creatures."),
  pilgrim: creature("pilgrim", 1, 1, "Whenever this creature attacks, if you control an artifact or enchantment, this creature gets +1/+1 and gains lifelink until end of turn."),
  arsonist: goblin("arsonist", "When this creature dies, you may have it deal 1 damage to any target."),
  wavecrasher: creature("wavecrasher", 2, 2, "When this creature enters, return another creature you control to its owner's hand."),
  grenade: spell("grenade", "sorcery", "As an additional cost to cast this spell, sacrifice a Goblin.\nGrenade deals 5 damage to any target."),
  lease: spell("lease", "instant", "This spell deals 3 damage to any target."),
  bear: creature("bear", 2, 2),
  big: creature("big", 5, 5),
  flyer: creature("flyer", 2, 2, "", { keywords: ["flying"] }),
  angel: creature("angel", 4, 4, "", { keywords: ["flying"] }),
  kreat: goblin("kreat", "Whenever one or more Goblins you control attack, create a 1/1 red Goblin creature token that's tapped and attacking."),
  bravery: ench("bravery", "Whenever one or more creatures you control attack, you gain life equal to the number of attacking creatures."),
  forest: { id: "forest", name: "Forest", type: "land", cost: 0, typeLine: "Basic Land — Forest" },
};

const perm = (iid: string, defId: string, owner: PlayerId = "p1") => ({ card: { iid, defId, owner } as CardInstance, tapped: false, summoningSick: false, damage: 0 });
function setup(hand: string[], mine: string[] = [], theirs: string[] = []): GameState {
  const g = createGame({ p1: Array(40).fill("mountain"), p2: Array(40).fill("mountain") }, 1);
  g.cards = { ...DEFS };
  g.players.p1.hand = hand.map((d, i) => ({ iid: `h${i}`, defId: d, owner: "p1" }));
  g.players.p2.hand = [];
  g.players.p1.battlefield = [...Array.from({ length: 6 }, (_, i) => perm(`l${i}`, "mountain")), ...mine.map((d, i) => perm(`m${i}`, d))];
  g.players.p2.battlefield = [...Array.from({ length: 6 }, (_, i) => perm(`q${i}`, "mountain", "p2")), ...theirs.map((d, i) => perm(`t${i}`, d, "p2"))];
  g.phase = "main1";
  g.active = "p1";
  return g;
}
const act = (s: GameState, p: PlayerId, a: Action): GameState => {
  const r = applyAction(s, p, a);
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.state;
};
const settle = (g: GameState): GameState => {
  for (let i = 0; i < 40 && g.priority && !g.pendingPick && !g.pendingChoice; i++) g = act(g, g.priority.holder, { type: "passPriority" });
  return g;
};
const find = (g: GameState, iid: string) => [...g.players.p1.battlefield, ...g.players.p2.battlefield].find((p) => p.card.iid === iid);
const on = (iid: string) => [{ kind: "permanent" as const, iid }];
const stat = (g: GameState, iid: string) => [powerOf(g, find(g, iid)!), toughnessOf(g, find(g, iid)!)];
const named = (g: GameState, who: PlayerId, name: string) => g.players[who].battlefield.filter((p) => g.cards[p.card.defId].name === name);

test("the round 3 texts are understood", () => {
  for (const id of ["krenko", "brightmare", "takeheart", "server", "falconer", "cloudshift", "warchief", "naiad", "discovery", "path", "scene", "lore", "seismic", "quake", "startling", "merfolk", "lynx", "oriflamme", "goon", "mare", "speaker", "prophecy", "hope", "valkyrie", "ardoz", "sanctuary", "phalanx", "tenacity", "pilgrim", "arsonist", "wavecrasher", "grenade", "kreat", "bravery"]) {
    assert.equal(isSupportedCard(DEFS[id]), true, id);
  }
});

test("tokens counted from the board: Krenko makes one per Goblin", () => {
  let g = setup([], ["krenko", "gob", "gob"]);
  const a = getActivatable(g, "p1").find((x) => x.iid === "m0")!;
  g = settle(act(g, "p1", { type: "activateAbility", iid: "m0", index: a.index, targets: [] }));
  assert.equal(named(g, "p1", "Goblin").length, 3, "three Goblins in play, so three Goblin tokens are made");
});

test("gain life equal to a power / for each creature", () => {
  let g = setup(["brightmare"], [], ["big"]);
  g.players.p1.life = 10;
  g = act(g, "p1", { type: "castCreature", iid: "h0" });
  g = settle(g);
  assert.ok(g.pendingChoice);
  g = settle(act(g, "p1", { type: "chooseTargets", targets: on("t0") }));
  assert.equal(g.players.p1.life, 15, "the tapped creature has power 5");
  assert.equal(find(g, "t0")?.tapped, true);
  let s = setup(["server"], ["bear", "bear"]);
  s.players.p1.life = 10;
  s = settle(act(s, "p1", { type: "castCreature", iid: "h0" }));
  assert.equal(s.players.p1.life, 12, "two other creatures");
});

test("a token that is created tapped and attacking joins the attack", () => {
  let g = setup([], ["falconer"]);
  g.phase = "attackers";
  g = settle(act(g, "p1", { type: "declareAttackers", attackers: ["m0"] }));
  const bird = named(g, "p1", "Bird")[0];
  assert.ok(bird, "a Bird exists");
  assert.equal(bird.tapped, true);
  assert.equal(g.combat?.attackers.some((a) => a.attacker === bird.card.iid), true);
});

test("exile and return: a blinked creature enters again", () => {
  let g = setup(["cloudshift"], ["lasher"]);
  g.players.p1.battlefield.find((p) => p.card.iid === "m0")!.counters = 5;
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: on("m0") }));
  const back = find(g, "m0");
  assert.ok(back);
  assert.equal(back.counters, 1, "counters are gone, and its enter trigger gave one new counter");
});

test("cost reductions: by type, on other turns, per opponent spell", () => {
  const g = setup([], ["warchief"]);
  assert.equal(castCostOf(g, "p1", DEFS.gob)?.generic, 0);
  const h = setup([], ["naiad"]);
  h.cards.three = creature("three", 1, 1, "", { manaCost: "{2}{R}", cost: 3 });
  assert.equal(castCostOf(h, "p1", h.cards.three)?.generic, 2, "my turn: full price");
  h.active = "p2";
  assert.equal(castCostOf(h, "p1", h.cards.three)?.generic, 1, "their turn: one less");
  const d = setup([], []);
  d.players.p2.spellsCastThisTurn = 1;
  assert.equal(castCostOf(d, "p1", DEFS.discovery)?.generic, 0, "{1}{U} less 1");
});

test("a creature type with haste, from another permanent", () => {
  const g = setup([], ["warchief", "gob"]);
  const fresh = g.players.p1.battlefield.find((p) => p.card.iid === "m1")!;
  fresh.summoningSick = true;
  g.phase = "attackers";
  const r = applyAction(g, "p1", { type: "declareAttackers", attackers: ["m1"] });
  assert.equal(r.ok, true, "Goblins have haste");
});

test("Path to Exile: the exiled creature's controller may fetch a basic land", () => {
  let g = setup(["path"], [], ["bear"]);
  g.cards.forest = DEFS.forest;
  g.players.p2.library = [{ iid: "f0", defId: "forest", owner: "p2" }, { iid: "f1", defId: "forest", owner: "p2" }];
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: on("t0") }));
  assert.equal(g.pendingPick?.kind, "searchLand");
  assert.equal(g.pendingPick?.player, "p2", "the creature's controller searches");
  g = act(g, "p2", { type: "pick", iid: "f0" });
  assert.equal(find(g, "f0")?.tapped, true);
});

test("its controller creates a token", () => {
  let g = setup(["scene"], [], ["bear"]);
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: on("t0") }));
  assert.equal(named(g, "p2", "Soldier").length, 1);
  assert.equal(named(g, "p1", "Soldier").length, 0);
});

test("discard at random", () => {
  let g = setup(["lore", "bear", "bear", "bear", "bear"]);
  g.players.p1.library = Array.from({ length: 10 }, (_, i) => ({ iid: `c${i}`, defId: "mountain", owner: "p1" as const }));
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: [] }));
  assert.equal(g.players.p1.hand.length, 4 + 4 - 3, "drew four, discarded three");
});

test("creatures without flying can't block; magmaquake spares flyers", () => {
  let g = setup(["seismic"], [], ["bear", "flyer"]);
  g = settle(act(g, "p1", { type: "castCreature", iid: "h0" }));
  g.active = "p2";
  g.phase = "attackers";
  g = settle(act(g, "p2", { type: "passPhase" }));
  let h = setup([], ["bear", "flyer"], ["bear"]);
  h.phase = "attackers";
  h.noGroundBlock = true;
  h.players.p2.battlefield[6].summoningSick = false;
  h = settle(act(h, "p1", { type: "declareAttackers", attackers: ["m0"] }));
  assert.equal(applyAction(h, "p2", { type: "declareBlockers", blocks: [{ blocker: "t0", attacker: "m0" }] }).ok, false);

  let q = setup(["quake"], ["bear", "flyer"], ["bear"]);
  q = settle(act(q, "p1", { type: "castSpell", iid: "h0", targets: [], x: 2 }));
  assert.equal(find(q, "m0"), undefined, "a ground 2/2 dies to 2 damage");
  assert.ok(find(q, "m1"), "the flyer is safe");
});

test("becomes a 4/4 until end of turn; loses defender", () => {
  let g = setup(["startling"], ["bear"]);
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: on("m0") }));
  assert.deepEqual(stat(g, "m0"), [4, 4]);
  let m = setup([], ["merfolk"]);
  const a = getActivatable(m, "p1").find((x) => x.iid === "m0")!;
  m.phase = "attackers";
  assert.equal(applyAction(m, "p1", { type: "declareAttackers", attackers: ["m0"] }).ok, false, "defender");
  m = settle(act(m, "p1", { type: "activateAbility", iid: "m0", index: a.index, targets: [] }));
  assert.equal(applyAction(m, "p1", { type: "declareAttackers", attackers: ["m0"] }).ok, true);
});

test("first strike on your turn only; attackers get +1/+0", () => {
  const g = setup([], ["lynx", "oriflamme", "bear"]);
  g.phase = "attackers";
  const keyword = (iid: string) => stat(g, iid);
  assert.deepEqual(keyword("m2"), [2, 2]);
  const r = act(g, "p1", { type: "declareAttackers", attackers: ["m2"] });
  assert.deepEqual([powerOf(r, find(r, "m2")!), toughnessOf(r, find(r, "m2")!)], [3, 2], "attacking: +1/+0");
});

test("can't attack unless you control more creatures", () => {
  const g = setup([], ["goon"], ["bear"]);
  g.phase = "attackers";
  assert.equal(applyAction(g, "p1", { type: "declareAttackers", attackers: ["m0"] }).ok, false);
  g.players.p1.battlefield.push(perm("extra", "bear"), perm("extra2", "bear"));
  assert.equal(applyAction(g, "p1", { type: "declareAttackers", attackers: ["m0"] }).ok, true);
});

test("can't be blocked by red creatures; gain life on entering or when targeted by an opponent", () => {
  let g = setup([], ["mare"], ["redbear"]);
  g.phase = "attackers";
  g = settle(act(g, "p1", { type: "declareAttackers", attackers: ["m0"] }));
  assert.equal(applyAction(g, "p2", { type: "declareBlockers", blocks: [{ blocker: "t0", attacker: "m0" }] }).ok, false);
  let t = setup([], ["mare"]);
  t.players.p2.hand = [{ iid: "z0", defId: "lease", owner: "p2" }];
  t.active = "p2";
  t.players.p1.life = 10;
  t = settle(act(t, "p2", { type: "castSpell", iid: "z0", targets: on("m0") }));
  assert.equal(t.players.p1.life, 13, "an opponent targeted it");
});

test("an ability gated on your life total", () => {
  const g = setup([], ["speaker"]);
  assert.equal(getActivatable(g, "p1").some((a) => a.iid === "m0"), false, "20 life is not enough");
  g.players.p1.life = 27;
  assert.equal(getActivatable(g, "p1").some((a) => a.iid === "m0"), true);
});

test("put a card on the bottom to draw; scry after a cheap bounce", () => {
  let g = setup(["prophecy", "bear"], [], ["bear"]);
  const library = g.players.p1.library.length;
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: on("t0") }));
  assert.equal(g.pendingPick?.kind, "rummage");
  g = act(g, "p1", { type: "pick", iid: "h1" });
  assert.equal(g.players.p1.library.length, library, "one card to the bottom, one drawn");
  assert.equal(g.players.p1.hand.some((c) => c.iid === "h1"), false);

  let h = setup(["hope"], [], ["bear"]);
  h = settle(act(h, "p1", { type: "castSpell", iid: "h0", targets: on("t0") }));
  assert.equal(h.pendingPick?.kind, "scry", "mana value 1 is 3 or less");
});

test("gain life equal to the toughness of the creature that entered; give it +2/+0", () => {
  let g = setup(["cleric"], ["valkyrie"]);
  g.players.p1.life = 10;
  g = settle(act(g, "p1", { type: "castCreature", iid: "h0" }));
  assert.equal(g.players.p1.life, 13);
  let a = setup(["bear"], ["ardoz"]);
  a = settle(act(a, "p1", { type: "castCreature", iid: "h0" }));
  assert.deepEqual(stat(a, "h0"), [4, 2], "the Bear that entered got +2/+0");
});

test("prevent noncombat damage to you and your creatures", () => {
  let g = setup(["lease"], ["sanctuary"], []);
  g.players.p2.hand = [{ iid: "z0", defId: "lease", owner: "p2" }];
  g.active = "p2";
  g = settle(act(g, "p2", { type: "castSpell", iid: "z0", targets: [{ kind: "player", id: "p1" }] }));
  assert.equal(g.players.p1.life, 20, "prevented");
  let t = setup(["bear"], ["sanctuary"]);
  t = settle(act(t, "p1", { type: "castCreature", iid: "h0" }));
  assert.equal(named(t, "p1", "Unicorn").length, 1, "a nontoken creature entered");
});

test("pump the others; untap and lifelink for the team", () => {
  let g = setup(["phalanx"], ["bear", "bear"]);
  g = settle(act(g, "p1", { type: "castSpell", iid: "h0", targets: on("m0") }));
  assert.deepEqual(stat(g, "m0"), [4, 3]);
  assert.deepEqual(stat(g, "m1"), [3, 3]);
  let t = setup(["tenacity"], ["bear"]);
  t.players.p1.battlefield.find((p) => p.card.iid === "m0")!.tapped = true;
  t = settle(act(t, "p1", { type: "castSpell", iid: "h0", targets: [] }));
  assert.equal(find(t, "m0")?.tapped, false);
  assert.deepEqual(stat(t, "m0"), [3, 3]);
});

test("attack trigger that needs an artifact or enchantment", () => {
  let g = setup([], ["pilgrim"]);
  g.phase = "attackers";
  const without = settle(act(g, "p1", { type: "declareAttackers", attackers: ["m0"] }));
  assert.deepEqual(stat(without, "m0"), [1, 1]);
  g.players.p1.battlefield.push(perm("e", "oriflamme"));
  const withIt = settle(act(g, "p1", { type: "declareAttackers", attackers: ["m0"] }));
  assert.equal(stat(withIt, "m0")[1], 2, "+1/+1 with an enchantment");
});

test("a dying creature may deal damage; return another creature you control; sacrifice a Goblin", () => {
  let g = setup(["lease"], ["arsonist"], []);
  g.players.p2.hand = [];
  g.cards.slay = spell("slay", "instant", "Destroy target creature.");
  g.players.p1.hand = [{ iid: "s0", defId: "slay", owner: "p1" }];
  g = settle(act(g, "p1", { type: "castSpell", iid: "s0", targets: on("m0") }));
  assert.ok(g.pendingChoice, "the death trigger asks for a target");
  g = settle(act(g, "p1", { type: "chooseTargets", targets: [{ kind: "player", id: "p2" }] }));
  assert.equal(g.players.p2.life, 19);

  let w = setup(["wavecrasher"], ["bear"]);
  w = settle(act(w, "p1", { type: "castCreature", iid: "h0" }));
  assert.equal(w.pendingPick?.kind, "bounceOwn");
  w = settle(act(w, "p1", { type: "pick", iid: "m0" }));
  assert.equal(w.players.p1.hand.some((c) => c.iid === "m0"), true);

  let s = setup(["grenade"], ["gob", "bear"]);
  assert.equal(applyAction(s, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "player", id: "p2" }], sacrifice: "m1" }).ok, false, "a Bear is not a Goblin");
  s = settle(act(s, "p1", { type: "castSpell", iid: "h0", targets: [{ kind: "player", id: "p2" }], sacrifice: "m0" }));
  assert.equal(s.players.p2.life, 15);
});

test("whenever one or more Goblins attack; gain life for each attacker", () => {
  let g = setup([], ["kreat", "bravery"]);
  g.phase = "attackers";
  g.players.p1.life = 10;
  g = settle(act(g, "p1", { type: "declareAttackers", attackers: ["m0"] }));
  assert.equal(named(g, "p1", "Goblin").length, 1, "a Goblin token joined the attack");
  let b = setup([], ["bear", "bear", "bravery"]);
  b.phase = "attackers";
  b.players.p1.life = 10;
  b = settle(act(b, "p1", { type: "declareAttackers", attackers: ["m0", "m1"] }));
  assert.equal(b.players.p1.life, 12);
});
