import { test } from "node:test";
import assert from "node:assert/strict";
import { isSupportedCard, parseManaCost, payMana } from "../index.js";
import type { CardDef, GameState } from "../index.js";
import { perm, plain, realCard, setup } from "./marvelKit.js";

// Marvel lands and mana creatures: dual lands with a condition, restricted mana, filter lands, big mana.

const cost = (text: string) => parseManaCost(text)!;

/** p1's battlefield is exactly these permanents (names from the real cards, or ids from `extra`). */
function board(names: string[], extra: Record<string, CardDef> = {}): GameState {
  const g = setup({ lands: 0, mine: names, extra });
  return g;
}

test("every Marvel land and mana creature in this batch is understood", () => {
  for (const name of ["Gathering Place", "Gleaming Bastion", "Dark Fortress", "Hidden Lair", "Training Compound", "Avengers Tower", "Surveillance Room", "Hydraulic Helper"]) {
    assert.equal(isSupportedCard(realCard(name)), true, name);
  }
});

test("Gathering Place: {G} or {W} only on the turn it entered or while you control a basic land", () => {
  const alone = board(["Gathering Place"]);
  assert.equal(payMana(alone, "p1", cost("{G}")).ok, false, "no basic land, not new: colorless only");
  assert.equal(payMana(alone, "p1", cost("{1}")).ok, true);
  const withPlains = board(["Gathering Place"]);
  withPlains.players.p1.battlefield.push(perm("pl", "plains"));
  assert.equal(payMana(withPlains, "p1", cost("{G}{W}")).ok, true, "Plains makes W, the dual makes G");
  const fresh = board(["Gathering Place"]);
  fresh.players.p1.battlefield[0].enteredTurn = fresh.turn;
  assert.equal(payMana(fresh, "p1", cost("{W}")).ok, true, "it entered this turn");
  fresh.turn += 1;
  assert.equal(payMana(fresh, "p1", cost("{W}")).ok, false, "next turn it no longer counts");
});

const VILLAIN = plain("vil", "Test Villain", "{R}", 1, 1, "", "Creature — Human Villain", ["R"]);
const HERO = plain("hero", "Test Hero", "{R}", 1, 1, "", "Creature — Human Hero", ["R"]);

test("Villainous Hideout: its colored mana only casts Villain spells (or pays for a Villain's ability)", () => {
  const g = board(["Villainous Hideout"], { vil: VILLAIN, hero: HERO });
  assert.equal(payMana(g, "p1", cost("{R}"), VILLAIN).ok, true);
  assert.equal(payMana(g, "p1", cost("{R}"), HERO).ok, false);
  assert.equal(payMana(g, "p1", cost("{R}")).ok, false, "not for something that isn't a spell or an ability");
  assert.equal(payMana(g, "p1", cost("{R}"), undefined, VILLAIN).ok, true, "a Villain's ability");
  assert.equal(payMana(g, "p1", cost("{R}"), undefined, HERO).ok, false);
});

test("Hydraulic Helper: {U} for artifact spells and any ability, never a nonartifact spell", () => {
  const rock = { ...plain("rock", "Test Rock", "{U}", 0, 0, "", "Artifact Creature — Robot", ["U"]), type: "creature" as const };
  const g = board(["Hydraulic Helper"], { rock });
  assert.equal(payMana(g, "p1", cost("{U}"), rock).ok, true);
  assert.equal(payMana(g, "p1", cost("{U}"), HERO).ok, false);
  assert.equal(payMana(g, "p1", cost("{U}"), undefined, HERO).ok, true);
});

test("Surveillance Room: pay {1} to make one mana of any color (so it fixes, it does not add)", () => {
  const g = board(["Surveillance Room"]);
  g.players.p1.battlefield.push(perm("pl", "plains"));
  const paid = payMana(g, "p1", cost("{U}"));
  assert.equal(paid.ok, true, "the Plains pays the {1}, the land makes {U}");
  assert.equal(paid.ok && paid.tap.length, 2);
  assert.equal(payMana(g, "p1", cost("{U}{W}")).ok, false, "still only two mana in all");
  assert.equal(payMana(g, "p1", cost("{C}")).ok, true, "or just tap it for colorless");
});

test("Baxter Building: {4}, {T}: four mana in any combination, so five lands can pay {R}{R}{G}{G}", () => {
  const g = board(["Baxter Building"]);
  for (let i = 0; i < 4; i++) g.players.p1.battlefield.push(perm(`pl${i}`, "plains"));
  assert.equal(payMana(g, "p1", cost("{R}{R}{G}{G}")).ok, true);
  assert.equal(payMana(g, "p1", cost("{R}{R}{G}{G}{G}")).ok, false);
});

test("Shang-Chi: two mana of one color, only for abilities of creature sources", () => {
  const g = board(["Shang-Chi, Master of Kung Fu"]);
  g.players.p1.battlefield[0].summoningSick = false;
  assert.equal(payMana(g, "p1", cost("{R}{R}"), undefined, HERO).ok, true);
  assert.equal(payMana(g, "p1", cost("{R}{G}"), undefined, HERO).ok, false, "both mana are the same color");
  assert.equal(payMana(g, "p1", cost("{2}"), HERO).ok, false, "not for spells");
  assert.equal(payMana(g, "p1", cost("{2}")).ok, false);
});

test("Doc Samson: X mana of one color, where X is his power", () => {
  const g = board(["Doc Samson, Super Psychiatrist"]);
  g.players.p1.battlefield[0].summoningSick = false;
  assert.equal(payMana(g, "p1", cost("{G}{G}{G}")).ok, true, "his power is 3");
  assert.equal(payMana(g, "p1", cost("{G}{G}{G}{G}")).ok, false);
  assert.equal(payMana(g, "p1", cost("{R}{G}")).ok, false, "one color");
});
