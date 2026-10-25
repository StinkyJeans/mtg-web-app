import { getCard } from "../../cards.js";
import { isBasicLand } from "../../deck.js";
import { parseManaCost, payMana } from "../../mana.js";
import { shuffle } from "../../state.js";
import { OPPONENT } from "../../types.js";
import type { CardInstance, PlayerId } from "../../types.js";
import { cardMatches, findPermanentOrNull, nameOf, playerLabel } from "../permanents.js";
import { drawCards, putCounters, removeFromBattlefield } from "../zones.js";
import { creatureEntered, queueTriggers } from "../triggers.js";
import { subjectsOf } from "../targets.js";
import { rngNext, plural, type EffectHandlers } from "./shared.js";

/** Drawing, discarding, and looking at or searching the library. */
export const LIBRARY_EFFECTS = {
  draw({ state, ctx, events, say, value }, effect) {
    for (const s of subjectsOf(state, effect.who, ctx)) {
      if (s.k !== "player") continue;
      drawCards(state, s.id, value(effect.amount), events);
      say(`${playerLabel(s.id)} draws ${plural(value(effect.amount), "card")}.`);
    }
  },
  revealPut({ state, ctx, events, say }, effect) {
    const library = state.players[ctx.controller].library;
    const top = library.splice(0, effect.n);
    const keep = top.filter((c) => cardMatches(getCard(state, c.defId), effect.filter) && getCard(state, c.defId).cost <= effect.maxMV);
    const rest = top.filter((c) => !keep.includes(c));
    for (const card of keep) {
      state.players[ctx.controller].battlefield.push({ card, tapped: false, summoningSick: true, damage: 0 });
      events.push({ type: "permanentEntered", player: ctx.controller, iid: card.iid });
      queueTriggers(state, card, ctx.controller, "enters");
      creatureEntered(state, card, ctx.controller);
    }
    const [ordered, rng] = shuffle(rest, state.rng);
    state.rng = rng;
    library.push(...ordered);
    say(`${playerLabel(ctx.controller)} reveals the top ${effect.n} cards and puts ${keep.length} onto the battlefield.`);
  },
  exileTop({ state, ctx, say }, effect) {
    const library = state.players[ctx.controller].library;
    const card = library.shift();
    if (!card) return;
    state.players[ctx.controller].exile.push(card);
    if (effect.playIfAttacked) (state.players[ctx.controller].mayPlay ??= []).push({ iid: card.iid, source: ctx.sourceId });
    say(`${playerLabel(ctx.controller)} exiles the top card of their library.`);
  },
  scryIfMV({ state, ctx, startPick }, effect) {
    const t = ctx.targets[effect.what.t === "target" ? effect.what.i : 0];
    const iid = t?.kind === "permanent" ? t.iid : undefined;
    const card = iid ? Object.values(state.players).flatMap((p) => [...p.hand, ...p.graveyard, ...p.library, ...p.exile]).find((c) => c.iid === iid) : undefined;
    if (!card || getCard(state, card.defId).cost > effect.max || state.pendingPick) return;
    const top = state.players[ctx.controller].library.slice(0, effect.n);
    if (top.length === 0) return;
    startPick({
      player: ctx.controller,
      prompt: `Scry ${top.length}: choose a card to put on the bottom of your library, or keep it on top`,
      kind: "scry",
      options: top.map((c) => c.iid),
      optional: true,
      owner: ctx.controller,
      remaining: top.length,
      ordered: [],
    });
  },
  drawUnlessPay({ state, ctx, events, say, startPick }, effect) {
    // The opponent who cast the spell may pay; otherwise the controller draws.
    const payer = OPPONENT[ctx.controller];
    const cost = parseManaCost(effect.cost);
    if (!cost || state.pendingPick) return;
    if (!payMana(state, payer, cost).ok) {
      drawCards(state, ctx.controller, 1, events);
      say(`${playerLabel(payer)} can't pay ${effect.cost}: ${playerLabel(ctx.controller)} draws a card.`);
      return;
    }
    startPick({
      player: payer,
      prompt: `${ctx.sourceName}: pay ${effect.cost}, or ${playerLabel(ctx.controller)} draws a card`,
      kind: "tax",
      options: ["pay"],
      optional: true,
      owner: payer,
      remaining: 1,
      ordered: [],
      wardCost: effect.cost,
      taxFor: ctx.controller,
    });
  },
  rummage({ state, ctx, startPick }, effect) {
    const hand = state.players[ctx.controller].hand;
    if (hand.length === 0 || state.pendingPick) return;
    startPick({
      player: ctx.controller,
      prompt: effect.toBottom ? "You may put a card from your hand on the bottom of your library. If you do, draw a card." : "You may discard a card. If you do, draw a card.",
      kind: "rummage",
      options: hand.map((c) => c.iid),
      optional: true,
      owner: ctx.controller,
      remaining: 1,
      ordered: [],
      ...(effect.toBottom ? { restToGraveyard: false, randomBottom: false, bottomIids: ["bottom"] } : {}),
    });
  },
  explore({ state, ctx, events, say, startPick }) {
    // Rule 701.44: a land goes to the hand; otherwise a +1/+1 counter, then the card stays on top or goes to the graveyard.
    const me = state.players[ctx.controller];
    const top = me.library[0];
    const self = findPermanentOrNull(state, ctx.sourceId);
    if (top) say(`${ctx.sourceName} explores and reveals ${getCard(state, top.defId).name}.`);
    if (top && getCard(state, top.defId).type === "land") {
      me.hand.push(me.library.shift()!);
      events.push({ type: "cardDrawn", player: ctx.controller, iid: top.iid });
      return;
    }
    if (self) putCounters(state, self.perm, self.owner.id, 1);
    if (!top) return;
    startPick({
      player: ctx.controller,
      prompt: `Explore: put ${getCard(state, top.defId).name} into your graveyard, or keep it on top of your library`,
      kind: "surveil",
      options: [top.iid],
      optional: true,
      owner: ctx.controller,
      remaining: 1,
      ordered: [],
    });
  },
  surveil({ state, ctx, startPick }, effect) {
    const top = state.players[ctx.controller].library.slice(0, effect.n);
    if (top.length === 0) return;
    startPick({
      player: ctx.controller,
      prompt: `Surveil ${top.length}: choose a card to put into your graveyard, or keep the rest on top`,
      kind: "surveil",
      options: top.map((c) => c.iid),
      optional: true,
      owner: ctx.controller,
      remaining: top.length,
      ordered: [],
    });
  },
  mill({ state, ctx, say, value }, effect) {
    for (const s of subjectsOf(state, effect.who, ctx)) {
      if (s.k !== "player") continue;
      const library = state.players[s.id].library;
      const milled = library.splice(0, Math.min(value(effect.amount), library.length));
      state.players[s.id].graveyard.push(...milled);
      say(`${playerLabel(s.id)} mills ${plural(milled.length, "card")}.`);
    }
  },
  scry({ state, ctx, startPick }, effect) {
    const top = state.players[ctx.controller].library.slice(0, effect.n);
    if (top.length === 0 || state.pendingPick) return;
    startPick({
      player: ctx.controller,
      prompt: `Scry ${top.length}: choose a card to put on the bottom of your library, or keep the rest on top`,
      kind: "scry",
      options: top.map((c) => c.iid),
      optional: true,
      owner: ctx.controller,
      remaining: top.length,
      ordered: [],
    });
  },
  discard({ state, ctx, events, startPick }, effect) {
    for (const s of subjectsOf(state, effect.who, ctx)) {
      if (s.k !== "player" || state.pendingPick) continue;
      const hand = state.players[s.id].hand;
      const count = Math.min(effect.amount, hand.length);
      if (count === 0) continue;
      if (effect.chooser === "random") {
        // "Discard three cards at random": no choice to make.
        const iids: string[] = [];
        for (let i = 0; i < count; i++) {
          const at = Math.floor(rngNext(state) * hand.length);
          iids.push(hand[at].iid);
          state.players[s.id].graveyard.push(...hand.splice(at, 1));
        }
        events.push({ type: "cardsDiscarded", player: s.id, iids });
        continue;
      }
      if (effect.chooser === "victim" && count >= hand.length) {
        // Nothing to choose: the whole hand goes.
        const iids = hand.map((c) => c.iid);
        state.players[s.id].graveyard.push(...hand.splice(0));
        events.push({ type: "cardsDiscarded", player: s.id, iids });
        continue;
      }
      startPick({
        player: effect.chooser === "you" ? ctx.controller : s.id,
        prompt: effect.chooser === "you" ? `${playerLabel(s.id)}'s hand: choose a card for them to discard` : `Discard ${plural(count, "card")}`,
        kind: "discard",
        options: hand.map((c) => c.iid),
        optional: false,
        owner: s.id,
        remaining: count,
        ordered: [],
      });
    }
  },
  lookPick({ state, ctx, startPick }, effect) {
    const target = effect.who ? subjectsOf(state, effect.who, ctx).find((s) => s.k === "player") : undefined;
    const owner = target?.k === "player" ? target.id : ctx.controller;
    const top = state.players[owner].library.slice(0, effect.n);
    if (top.length === 0 || (effect.mode === "arrange" && top.length < 2) || state.pendingPick) return;
    const prompts = {
      toHand: "Choose the card to put into your hand. The other goes to the bottom of your library.",
      toGraveyard: `Put the top card of ${playerLabel(owner)}'s library into their graveyard?`,
      arrange: `Choose the card to put on top of your library (${plural(top.length, "card")} to arrange).`,
    };
    startPick({
      player: ctx.controller,
      prompt: prompts[effect.mode],
      kind: effect.mode,
      options: top.map((c) => c.iid),
      optional: effect.mode === "toGraveyard",
      owner,
      remaining: 1,
      ordered: [],
    });
  },
  revealToHand({ state, ctx, say, startPick }, effect) {
    const library = state.players[ctx.controller].library;
    const top = library.slice(0, effect.n);
    if (top.length === 0 || state.pendingPick) return;
    const matches = (c: CardInstance) => cardMatches(getCard(state, c.defId), effect.filter);
    const options = top.filter(matches).map((c) => c.iid);
    const bottom = (iids: string[]) => {
      const cards = iids.map((id) => library.splice(library.findIndex((c) => c.iid === id), 1)[0]);
      if (effect.restTo === "graveyard") {
        state.players[ctx.controller].graveyard.push(...cards);
        return;
      }
      const [ordered, rng] = effect.random ? shuffle(cards, state.rng) : [cards, state.rng];
      state.rng = rng;
      library.push(...ordered);
    };
    if (options.length === 0) {
      say(`${playerLabel(ctx.controller)} looks at the top ${plural(top.length, "card")}: nothing to take. They go to the bottom of the library.`);
      bottom(top.map((c) => c.iid));
      return;
    }
    startPick({
      player: ctx.controller,
      prompt: `Look at the top ${plural(top.length, "card")}: ${effect.required ? "choose one to put" : "you may take one of these"} into your hand. The rest go ${effect.restTo === "graveyard" ? "to your graveyard" : "to the bottom of your library"}.`,
      kind: "revealToHand",
      options,
      optional: effect.required !== true,
      owner: ctx.controller,
      remaining: 1,
      ordered: [],
      bottomIids: top.map((c) => c.iid),
      randomBottom: effect.random,
      restToGraveyard: effect.restTo === "graveyard",
      reveal: effect.reveal,
    });
  },
  search({ state, ctx, startPick }, effect) {
    if (state.pendingPick) return;
    // "Its controller may search": usually the player of the effect, sometimes another one (Path to Exile).
    const searcher = effect.who ? ((subjectsOf(state, effect.who, ctx).find((s) => s.k === "player") as { k: "player"; id: PlayerId } | undefined)?.id ?? ctx.controller) : ctx.controller;
    const library = state.players[searcher].library;
    const any = effect.for === "any";
    const seen = new Set<string>();
    const options = library.filter((c) => (any || isBasicLand(getCard(state, c.defId))) && (any || (!seen.has(c.defId) && seen.add(c.defId)))).map((c) => c.iid);
    if (options.length === 0) {
      [state.players[searcher].library, state.rng] = shuffle(library, state.rng);
      return;
    }
    const toHand = effect.to === "hand";
    startPick({
      player: searcher,
      prompt: toHand ? `Search your library: choose a ${any ? "card" : "basic land"} to put into your hand` : `Search your library: choose a basic land to put onto the battlefield${effect.tapped === false ? "" : " tapped"}`,
      kind: toHand ? "searchAny" : "searchLand",
      entersTapped: effect.tapped !== false,
      reveal: effect.reveal,
      options,
      optional: true,
      owner: searcher,
      remaining: 1,
      ordered: [],
    });
  },
  topOfLibrary({ state, ctx, say }, effect) {
    for (const s of subjectsOf(state, effect.what, ctx)) {
      if (s.k !== "perm") continue;
      const card = removeFromBattlefield(state, s.perm, s.owner);
      if (card) {
        state.players[card.owner].library.unshift(card);
        say(`${getCard(state, card.defId).name} is put on top of its owner's library.`);
      }
    }
  },
  libraryChoice({ state, ctx, startPick }, effect) {
    for (const s of subjectsOf(state, effect.what, ctx)) {
      if (s.k !== "perm" || state.pendingPick) continue;
      startPick({
        player: s.owner,
        prompt: `${nameOf(state, s.perm)}: put it on the top or the bottom of its owner's library?`,
        kind: "topBottom",
        options: ["top", "bottom"],
        optional: false,
        owner: s.owner,
        remaining: 1,
        ordered: [],
        toggleIid: s.perm.card.iid,
      });
    }
  },
} satisfies EffectHandlers;
