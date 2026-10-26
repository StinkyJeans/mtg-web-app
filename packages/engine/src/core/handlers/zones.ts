import { getCard } from "../../cards.js";
import type { CardInstance, PlayerId } from "../../types.js";
import { findPermanentOrNull, isCreature, kw, nameOf, playerLabel } from "../permanents.js";
import { makeToken, putCounters, putIntoGraveyard, regenerateInstead, removeFromBattlefield, spellLeavesStack } from "../zones.js";
import { creatureEntered, queueTriggers } from "../triggers.js";
import { subjectsOf } from "../targets.js";
import { plural, type EffectHandlers } from "./shared.js";

/** Cards moving between the battlefield, the hand, the graveyard and exile, and tokens being made. */
export const ZONE_EFFECTS = {
  destroy({ state, ctx, events, say, preventRegen }, effect) {
    for (const s of subjectsOf(state, effect.what, ctx)) {
      if (s.k !== "perm" || kw(state, s.perm, "indestructible")) continue;
      if (preventRegen) s.perm.noRegen = true;
      if (regenerateInstead(state, s.perm)) say(`${nameOf(state, s.perm)} regenerates.`);
      else putIntoGraveyard(state, s.perm, s.owner, events);
    }
  },
  exile({ state, ctx, say }, effect) {
    for (const s of subjectsOf(state, effect.what, ctx)) {
      if (s.k !== "perm") continue;
      const card = removeFromBattlefield(state, s.perm, s.owner);
      if (card) {
        state.players[card.owner].exile.push(card);
        say(`${getCard(state, card.defId).name} is exiled.`);
      }
    }
  },
  bounce({ state, ctx, say }, effect) {
    for (const s of subjectsOf(state, effect.what, ctx)) {
      if (s.k === "stack" && s.item.kind === "spell") {
        // "Return target spell to its owner's hand": it leaves the stack without resolving.
        state.stack.splice(state.stack.indexOf(s.item), 1);
        spellLeavesStack(state, s.item, "hand");
        say(`${getCard(state, s.item.card.defId).name} returns to its owner's hand.`);
        continue;
      }
      if (s.k !== "perm") continue;
      const card = removeFromBattlefield(state, s.perm, s.owner);
      if (card) {
        state.players[card.owner].hand.push(card);
        say(`${getCard(state, card.defId).name} returns to its owner's hand.`);
      }
    }
  },
  blink({ state, ctx, events, say }, effect) {
    for (const s of subjectsOf(state, effect.what, ctx)) {
      if (s.k !== "perm") continue;
      const card = removeFromBattlefield(state, s.perm, s.owner);
      if (!card) continue;
      // It comes back as a new object: no counters, damage or attachments, and its "enters" abilities trigger again.
      state.players[card.owner].battlefield.push({ card, tapped: false, summoningSick: true, damage: 0 });
      events.push({ type: "permanentEntered", player: card.owner, iid: card.iid });
      queueTriggers(state, card, card.owner, "enters");
      creatureEntered(state, card, card.owner);
      say(`${getCard(state, card.defId).name} is exiled and returns to the battlefield.`);
    }
  },
  bounceOwn({ state, ctx, startPick }, effect) {
    const mine = state.players[ctx.controller].battlefield.filter((p) => isCreature(state, p) && !(effect.other && p.card.iid === ctx.sourceId));
    if (mine.length === 0 || state.pendingPick) return;
    startPick({
      player: ctx.controller,
      prompt: `${ctx.sourceName}: choose ${effect.other ? "another creature" : "a creature"} you control to return to its owner's hand`,
      kind: "bounceOwn",
      options: mine.map((p) => p.card.iid),
      optional: false,
      owner: ctx.controller,
      remaining: 1,
      ordered: [],
    });
  },
  sacrifice({ state, ctx, events, say }, effect) {
    for (const s of subjectsOf(state, effect.what, ctx)) {
      if (s.k !== "perm") continue;
      say(`${nameOf(state, s.perm)} is sacrificed.`);
      putIntoGraveyard(state, s.perm, s.owner, events);
    }
  },
  exileUntilLeaves({ state, ctx, say }, effect) {
    // The source must still be on the battlefield: otherwise nothing is exiled (rule 610.3c).
    const holder = findPermanentOrNull(state, ctx.sourceId)?.perm;
    for (const s of subjectsOf(state, effect.what, ctx)) {
      if (s.k !== "perm" || !holder) continue;
      const card = removeFromBattlefield(state, s.perm, s.owner);
      if (!card) continue;
      state.players[card.owner].exile.push(card);
      holder.held = [...(holder.held ?? []), card];
      say(`${getCard(state, card.defId).name} is exiled until ${nameOf(state, holder)} leaves the battlefield.`);
    }
  },
  returnFromYard({ state, ctx, say }) {
    // "When this dies, return it to its owner's hand": the card is in its owner's graveyard by now.
    for (const p of Object.values(state.players)) {
      const at = p.graveyard.findIndex((c) => c.iid === ctx.sourceId);
      if (at < 0) continue;
      const [card] = p.graveyard.splice(at, 1);
      p.hand.push(card);
      say(`${getCard(state, card.defId).name} returns to its owner's hand.`);
    }
  },
  returnAsEnchantment({ state, ctx, events, say }) {
    // "Return it to the battlefield under its owner's control. It's an enchantment. (It's not a creature.)"
    const owner = Object.values(state.players).find((p) => p.graveyard.some((c) => c.iid === ctx.sourceId));
    if (!owner) return;
    const [card] = owner.graveyard.splice(owner.graveyard.findIndex((c) => c.iid === ctx.sourceId), 1);
    const id = `${card.defId}@enchantment`;
    if (!state.cards[id]) {
      const printed = getCard(state, card.defId);
      state.cards[id] = { ...printed, id, type: "enchantment", typeLine: (printed.typeLine ?? "Enchantment").replace(/\bCreature ?/, "").replace(/\s+—/, " —").trim(), power: undefined, toughness: undefined };
    }
    const returned: CardInstance = { iid: card.iid, defId: id, owner: card.owner, printed: card.defId };
    owner.battlefield.push({ card: returned, tapped: false, summoningSick: false, damage: 0 });
    events.push({ type: "permanentEntered", player: owner.id, iid: card.iid });
    queueTriggers(state, returned, owner.id, "enters");
    creatureEntered(state, returned, owner.id);
    say(`${getCard(state, id).name} returns to the battlefield as an enchantment.`);
  },
  returnSelfToBattlefield({ state, ctx, events, say }, effect) {
    const owner = Object.values(state.players).find((p) => p.graveyard.some((c) => c.iid === ctx.sourceId));
    if (!owner) return;
    const [card] = owner.graveyard.splice(owner.graveyard.findIndex((c) => c.iid === ctx.sourceId), 1);
    owner.battlefield.push({ card, tapped: effect.tapped === true, summoningSick: true, damage: 0 });
    events.push({ type: "permanentEntered", player: owner.id, iid: card.iid });
    if (effect.counters) putCounters(state, owner.battlefield[owner.battlefield.length - 1], owner.id, effect.counters);
    queueTriggers(state, card, owner.id, "enters");
    creatureEntered(state, card, owner.id);
    say(`${getCard(state, card.defId).name} returns to the battlefield${effect.tapped ? " tapped" : ""}.`);
  },
  createToken({ state, ctx, events, say, value }, effect) {
    const n = value(effect.amount);
    // "Its controller creates a 1/1 token": the player is not always the one who cast the spell.
    const who = effect.who ? (subjectsOf(state, effect.who, ctx).find((s) => s.k === "player") as { k: "player"; id: PlayerId } | undefined)?.id : ctx.controller;
    if (!who) return;
    for (let i = 0; i < n; i++) makeToken(state, effect.token, who, events);
    if (n > 0) say(`${playerLabel(who)} creates ${plural(n, `${effect.token.name} token`)}.`);
  },
  reanimate({ state, ctx, events, say }, effect) {
    for (const s of subjectsOf(state, effect.what, ctx)) {
      if (s.k !== "card") continue;
      const yard = state.players[s.owner].graveyard;
      yard.splice(yard.indexOf(s.card), 1);
      const name = getCard(state, s.card.defId).name;
      if (effect.to === "hand") {
        state.players[s.card.owner].hand.push(s.card);
        say(`${name} returns to its owner's hand.`);
      } else {
        // It comes back under the control of the player who used the effect.
        state.players[ctx.controller].battlefield.push({ card: s.card, tapped: effect.tapped === true, summoningSick: true, damage: 0, ...(effect.finality ? { finality: true } : {}) });
        events.push({ type: "permanentEntered", player: ctx.controller, iid: s.card.iid });
        queueTriggers(state, s.card, ctx.controller, "enters");
        creatureEntered(state, s.card, ctx.controller);
      }
    }
  },
  exileFromHand({ state, ctx, startPick }, effect) {
    // The source must still be on the battlefield to keep the card (rule 610.3c); the hand is looked at either way.
    for (const s of subjectsOf(state, effect.who, ctx)) {
      if (s.k !== "player" || state.pendingPick) continue;
      const hand = state.players[s.id].hand;
      if (hand.length === 0) continue;
      const holder = findPermanentOrNull(state, ctx.sourceId)?.perm;
      const nonland = hand.filter((c) => getCard(state, c.defId).type !== "land").map((c) => c.iid);
      startPick({
        player: ctx.controller,
        prompt: `${playerLabel(s.id)}'s hand: you may exile a nonland card from it until ${ctx.sourceName} leaves the battlefield`,
        kind: "handExile",
        options: holder ? nonland : [],
        seen: hand.map((c) => c.iid).filter((iid) => !holder || !nonland.includes(iid)),
        optional: true,
        owner: s.id,
        remaining: 1,
        ordered: [],
        ...(holder ? { holder: holder.card.iid } : {}),
      });
    }
  },
  exileToPlay({ state, ctx, startPick }, effect) {
    for (const s of subjectsOf(state, effect.who, ctx)) {
      if (s.k !== "player" || state.pendingPick || state.players[s.id].hand.length === 0) continue;
      startPick({
        player: s.id,
        prompt: `${ctx.sourceName}: exile a card from your hand. You may play it while it stays exiled (a spell costs {${effect.tax}} more, a land enters tapped).`,
        kind: "exileToPlay",
        options: state.players[s.id].hand.map((c) => c.iid),
        optional: false,
        owner: s.id,
        remaining: 1,
        ordered: [],
        playTax: effect.tax,
        playLandTapped: effect.tappedLand,
      });
    }
  },
  yardCastable({ state, ctx, say }) {
    // Only the creature cards there now (rule 611.2c): one put there later doesn't gain it.
    const me = state.players[ctx.controller];
    me.yardCastable = [...new Set([...(me.yardCastable ?? []), ...me.graveyard.filter((c) => getCard(state, c.defId).type === "creature").map((c) => c.iid)])];
    say(`Until end of turn, ${playerLabel(ctx.controller)} may cast creature cards from their graveyard.`);
  },
  warpExile({ state, ctx, say }) {
    const found = findPermanentOrNull(state, ctx.sourceId);
    if (!found?.perm.warped) return; // it left the battlefield already (and came back as a new object)
    const card = removeFromBattlefield(state, found.perm, found.owner.id);
    if (!card) return;
    state.players[card.owner].exile.push(card);
    state.players[card.owner].mayPlay = [...(state.players[card.owner].mayPlay ?? []), { iid: card.iid, source: "warp", fromTurn: state.turn + 1 }];
    say(`${ctx.sourceName} is exiled (warp). Its owner may cast it from exile on a later turn.`);
  },
} satisfies EffectHandlers;
