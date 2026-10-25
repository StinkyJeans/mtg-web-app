"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { flushSync } from "react-dom";
import Link from "next/link";
import {
  applyAction,
  createGame,
  DECK_SIZES,
  getActivatable,
  getCastable,
  getCrewable,
  getCyclable,
  getLoyaltyAbilities,
  castCostOf,
  manaSourcesToConfirm,
  parseManaCost,
  getDamageAssignments,
  getLegalActions,
  getPossibleAttackers,
  getForcedBlocks,
  getPossibleBlockers,
  MAX_HAND_SIZE,
  MAX_LANDS_PER_TURN,
  MAX_MULLIGANS,
  OPPONENT,
  parseCard,
  payMana,
  playerToAct,
  powerOf,
  STARTER_DECK,
  STARTING_HAND,
  suggestDamageAssignment,
  toughnessOf,
  legalTargets,
} from "@mtg/engine";
import type { Action, Activatable, Castable, CardDef, GameEvent, GameState, Permanent, PlayerId, TargetChoice, TargetSpec } from "@mtg/engine";
import { useBattlefieldBackground } from "@/lib/background";
import { leaveRoom, onGameUpdate, send as netSend, tryReconnect, useOnline } from "@/lib/online/session";
import { fetchCardsByIds } from "@/lib/cards";
import { buildRandomDeck } from "@/lib/randomDeck";
import { deckStatus, expandDeck, listMyDecks, loadDefsFor } from "@/lib/decks";
import CardDetail, { CardImage, Lightbox } from "./CardDetail";
import type { Inspected } from "./CardDetail";
import CardView from "./CardView";
import CoinFlip from "./CoinFlip";
import { isCombatPlaying, playCombat } from "./combatFx";
import { ResignDialog, VictoryDialog } from "./EndDialogs";
import { GraveyardDialog, Pile } from "./Piles";
import { hideDrawn, isPileBusy, playDeal, playDraws, playToGraveyard } from "./pileFx";
import type { Draw } from "./pileFx";
import { announcementsFrom, describeEvents, endReason, playerName } from "./log";
import type { Announcement } from "./log";
import Announcements, { PassReminder, PlayedThisTurn, TurnSplash } from "./Announcements";
import { ChatPanel, LogPanel, PlayersPanel } from "./SidePanels";
import { ManaText } from "./ManaSymbols";
import BackgroundPicker from "./BackgroundPicker";
import AppearanceDialog from "./AppearanceDialog";
import FitToHeight from "./FitToHeight";
import { useAppearance } from "@/lib/playmat";
import { useCustomCursor } from "@/lib/cursor";
import BlockPanel from "./BlockPanel";
import { attackHint, blockHint } from "./combatHints";
import { BANNER, PLAYER_STYLE } from "./theme";
import type { BannerMode } from "./theme";
import { AbilityPanel, ChoicePanel, PickPanel, readable, ResolvingNotice, StackPanel, TargetPanel, XPanel } from "./StackPanel";
import Tip from "./Tip";
import type { ChatMessage } from "./SidePanels";

const PHASES = [
  ["mulligan", "Mulligan"],
  ["main1", "Main 1"],
  ["attackers", "Attack"],
  ["blockers", "Block"],
  ["damage", "Damage"],
  ["main2", "Main 2"],
  ["end", "End"],
  ["cleanup", "Cleanup"],
] as const;

const PASS_LABEL: Record<string, string> = {
  main1: "Go to combat",
  main2: "Go to end step",
  end: "Pass turn",
};

const PHASE_TEXT: Record<string, string> = {
  mulligan: "keeps or mulligans",
  blockers: "chooses blockers",
  damage: "assigns combat damage",
  end: "ends the turn",
  cleanup: "discards to hand size",
};

const newSeed = () => Date.now() % 2_147_483_647;

interface DeckOption {
  id: string;
  name: string;
  ids: string[]; // one card id per copy
}

const STARTER: DeckOption = { id: "starter", name: "Starter deck", ids: STARTER_DECK };
const RANDOM_ID = "random"; // a deck built at random when the game starts

/** Width of the big card shown while the mouse is over a card in hand. */
const HAND_ZOOM_W = 320;
/** How long "Your turn" stays on screen; matches the turn-splash animation in globals.css. */
const TURN_SPLASH_MS = 1800;
// How long a player can sit on their own turn before being reminded to pass it; shorter once nothing is left to do.
const REMIND_IDLE_MS = 20000;
const REMIND_DONE_MS = 6000;

/**
 * The online play screen, one per match. Next.js keeps a page alive after leaving it (cacheComponents),
 * so without the key a new match would open on the last match's board and end popup.
 */
export function OnlineGame() {
  const { matchId } = useOnline();
  return <Game key={matchId ?? "none"} online />;
}

/**
 * The play screen. On its own (hot-seat) it runs the game itself, with both players on one screen.
 * With `online` the game runs on the game server: this screen shows the game as the server describes it to this player,
 * sends this player's actions, and does nothing while it is the other player's turn.
 */
export default function Game({ online = false }: { online?: boolean } = {}) {
  const [localGame, setGame] = useState<GameState | null>(null);
  const net = useOnline();
  /** The game on screen: hot-seat, the one this screen has been updating, or (right after joining) the server's first view. */
  const game = localGame ?? (online ? (net.game?.view ?? null) : null);
  const router = useRouter();
  // Which player this browser is. Remembered, because leaving the room at the end clears `net.game`:
  // falling back to the player to act would flip the screen (and the end popup) to the opponent's side.
  const [seat, setSeat] = useState<PlayerId | null>(null);
  if (online && net.game && net.game.you !== seat) setSeat(net.game.you);
  const gameRef = useRef<GameState | null>(null);
  const commitRef = useRef<(r: { state: GameState; events: GameEvent[] }) => Promise<void>>(async () => {});
  const dealt = useRef(false);
  const background = useBattlefieldBackground(); // the picture behind the battlefield
  const look = useAppearance(); // each player's card sleeves and playmat
  const [lookOpen, setLookOpen] = useState(false);
  const [cursorOn, setCursorOn] = useCustomCursor();
  // The Magic cursor is for the play screen only: the page gets a class while this screen is open.
  useEffect(() => {
    document.body.classList.toggle("mtg-cursor", cursorOn);
    return () => document.body.classList.remove("mtg-cursor");
  }, [cursorOn]);
  const [localLog, setLog] = useState<string[]>([]);
  const log = online && net.game?.summary ? [...localLog, net.game.summary] : localLog; // newest first; the coin toss is the oldest line
  const [localError, setError] = useState<string | null>(null);
  const error = localError ?? (online ? net.error : null);
  const [attacking, setAttacking] = useState<string[]>([]);
  const [chosenBlocks, setBlocks] = useState<Record<string, string>>({}); // blocker iid -> attacker iid, as chosen by the player
  const [picked, setPicked] = useState<string | null>(null); // blocker waiting for an attacker
  const [handPick, setHandPick] = useState<string[]>([]); // cards chosen to bottom (mulligan) or discard (cleanup)
  const [assign, setAssign] = useState<Record<string, Record<string, number>>>({}); // attacker -> blocker -> damage
  const [localChat, setChat] = useState<ChatMessage[]>([]);
  const chat: ChatMessage[] = online ? net.chat.map((m) => ({ id: m.id, from: m.from, text: m.text })) : localChat;
  const [inspected, setInspected] = useState<Inspected | null>(null);
  const [zoomed, setZoomed] = useState<CardDef | null>(null); // card shown large in the popup
  const [resigning, setResigning] = useState<PlayerId | null>(null); // player being asked to confirm a resignation
  // A spell or ability being set up: its targets are picked one by one, then `build` makes the action.
  const [targeting, setTargeting] = useState<{ title: string; specs: TargetSpec[]; build: (t: TargetChoice[]) => Action; detail?: string } | null>(null);
  const [chosen, setChosen] = useState<TargetChoice[]>([]);
  const [aimed, setAimed] = useState<TargetChoice | null>(null); // a target clicked, waiting for "Confirm target"
  const [confirmSkip, setConfirmSkip] = useState(false); // "Skip attack" asks once more while a creature could attack
  // A spell being cast step by step: modes, then the kicker, then X, then targets.
  const [plan, setPlan] = useState<{ iid: string; name: string; from?: "graveyard" | "exile"; castable: Castable; modes?: number[]; kicked?: boolean; x?: number; sacrifice?: string } | null>(null);
  const [modePick, setModePick] = useState<number[]>([]);
  const [history, setHistory] = useState<Announcement[]>([]); // everything cast or used, kept for the turn
  const [announcements, setAnnouncements] = useState<Announcement[]>([]); // "Player 1 cast ...", shown on the caster's side
  const [lifeConfirm, setLifeConfirm] = useState<{ text: string; options: { label: string; go: () => void }[] } | null>(null); // "this costs life / taps a creature: do it?"
  const [xValue, setXValue] = useState(0);
  const [attackTargets, setAttackTargets] = useState<Record<string, string>>({}); // attacker iid -> planeswalker iid
  const [handHover, setHandHover] = useState<{ def: CardDef; left: number; top: number } | null>(null); // the big card shown while the mouse is over a card
  const [abilitiesOpen, setAbilitiesOpen] = useState(false); // the abilities pop-up
  const [viewingYard, setViewingYard] = useState<{ owner: PlayerId; zone: "graveyard" | "exile" } | null>(null); // whose graveyard or exile is open
  const [endNote, setEndNote] = useState<string | null>(null); // how the game ended, for the win popup
  const [turnSplash, setTurnSplash] = useState(0); // online: counts "Your turn" splashes, 0 while none is on screen

  const [loading, setLoading] = useState(false);
  // Decks and cards are loaded, and the players are flipping the coin before the game is created.
  const [pending, setPending] = useState<{ decks: Record<PlayerId, string[]>; names: Record<PlayerId, string>; cards: Record<string, CardDef> } | null>(null);
  const [localDeckNames, setDeckNames] = useState<Record<PlayerId, string>>({ p1: "", p2: "" });
  const deckNames = online && net.game ? net.game.deckNames : localDeckNames; // shown on each library
  const [options, setOptions] = useState<DeckOption[]>([STARTER]);
  // Each player votes for a deck size; the game can start only when both vote for the same one.
  const [votes, setVotes] = useState<Record<PlayerId, number | null>>({ p1: null, p2: null });
  const [hidden, setHidden] = useState(0); // saved decks that can't be played yet
  const [choice, setChoice] = useState<Record<PlayerId, string>>({ p1: RANDOM_ID, p2: RANDOM_ID });
  const agreedSize = votes.p1 !== null && votes.p1 === votes.p2 ? votes.p1 : null;
  // Decks of exactly the agreed size (the starter deck has 40), plus a random one for players without a deck.
  const deckChoices = agreedSize ? options.filter((o) => o.ids.length === agreedSize) : [];

  useEffect(() => {
    gameRef.current = game;
    commitRef.current = commit;
  });

  // Online: the opening hand is hidden before it is ever painted, then flies in from the library.
  useLayoutEffect(() => {
    if (!online || !game || !net.game || dealt.current) return;
    dealt.current = true;
    if (!net.game.fresh) return;
    const hand = handDraws(game);
    hideDrawn(hand);
    void playDeal(hand);
  });

  // Online: every change to the game arrives from the server, one at a time, in order.
  useEffect(() => {
    if (!online) return;
    let chain: Promise<void> = Promise.resolve();
    const off = onGameUpdate((u) => {
      chain = chain.then(async () => {
        for (let i = 0; i < 100 && !gameRef.current; i++) await new Promise((r) => setTimeout(r, 50)); // the opening deal comes first
        const before = gameRef.current;
        // Combat damage: play the attack on the board as it is now, then show the result.
        if (before?.combat && u.events.some((e) => e.type === "combatDamage")) await playCombat(u.events, before.combat.attackers.map((a) => a.attacker));
        await commitRef.current({ state: u.view, events: u.events });
      });
    });
    return off;
  }, [online]);

  // Online: a page that was just refreshed picks its seat up again.
  useEffect(() => {
    if (online) void tryReconnect();
  }, [online]);

  // Online with no match (the page was opened directly, or the room closed): back to the lobby.
  useEffect(() => {
    if (!online || net.snapshot || net.game) return;
    const timer = setTimeout(() => router.replace("/"), 2500);
    return () => clearTimeout(timer);
  }, [online, net.snapshot, net.game, router]);

  // Offer the starter deck plus every saved deck that is legal and fully playable.
  useEffect(() => {
    let cancelled = false;
    listMyDecks()
      .then(async (decks) => {
        const defs = await loadDefsFor(decks);
        const ready = decks.filter((d) => deckStatus(defs, d.entries).ready);
        return { ready, hidden: decks.length - ready.length };
      })
      .then(({ ready, hidden }) => {
        if (cancelled) return;
        setOptions([STARTER, ...ready.map((d) => ({ id: d.id, name: d.name, ids: expandDeck(d.entries) }))]);
        setHidden(hidden);
      })
      .catch(() => {}); // the starter deck still works if saved decks can't be loaded
    return () => {
      cancelled = true;
    };
  }, []);

  async function startGame() {
    setLoading(true);
    setError(null);
    try {
      if (!agreedSize) throw new Error("Both players must vote for the same deck size first.");
      const pick = async (p: PlayerId) => {
        if (choice[p] === RANDOM_ID) return buildRandomDeck(agreedSize);
        const o = options.find((x) => x.id === choice[p]);
        return { ids: o?.ids ?? [], name: o?.name ?? "Deck" };
      };
      const [d1, d2] = [await pick("p1"), await pick("p2")];
      const decks = { p1: d1.ids, p2: d2.ids };
      const names = { p1: d1.name, p2: d2.name };
      const cards = await fetchCardsByIds([...decks.p1, ...decks.p2]);
      const missing = [...decks.p1, ...decks.p2].find((id) => !cards[id]);
      if (missing) throw new Error(`Card "${missing}" is missing from the database. Did you run the card import?`);
      setGame(null);
      setPending({ decks, names, cards });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load cards.");
    } finally {
      setLoading(false);
    }
  }

  // The "Your turn" splash goes away by itself.
  useEffect(() => {
    if (turnSplash === 0) return;
    const timer = setTimeout(() => setTurnSplash(0), TURN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, [turnSplash]);

  // An announcement fades away by itself after a few seconds.
  useEffect(() => {
    if (announcements.length === 0) return;
    const timer = setTimeout(() => setAnnouncements((l) => l.slice(1)), 7000);
    return () => clearTimeout(timer);
  }, [announcements]);

  function resetSelection() {
    setTargeting(null);
    setChosen([]);
    setAimed(null);
    setConfirmSkip(false);
    setPlan(null);
    setLifeConfirm(null);
    setModePick([]);
    setAttackTargets({});
    setAttacking([]);
    setBlocks({});
    setPicked(null);
    setHandPick([]);
    setAssign({});
  }

  if (online && !game) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-zinc-900">
        <h1 className="text-2xl font-bold">Joining the match…</h1>
        <p className="text-zinc-600">If this takes more than a few seconds you will be taken back to the lobby.</p>
      </main>
    );
  }

  if (!game && pending) {
    return (
      <CoinFlip
        caller="p1"
        onBack={() => setPending(null)}
        onDone={(first, summary) => {
          const fresh = createGame(pending.decks, newSeed(), pending.cards, { startingPlayer: first, mulligan: true });
          flushSync(() => {
            setGame(fresh);
            setLog([summary]);
            setChat([]);
            setInspected(null);
            setEndNote(null);
            setResigning(null);
            resetSelection();
            setPending(null);
            setDeckNames(pending.names);
            setHistory([]);
            setAnnouncements([]);
          });
          // The opening seven are dealt from the library into the hand.
          const dealt = handDraws(fresh);
          hideDrawn(dealt);
          void playDeal(dealt);
        }}
      />
    );
  }

  if (!game) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-zinc-900">
        <h1 className="text-3xl font-bold">Hot-seat duel</h1>
        <p className="text-zinc-600">Two players, one screen. Heads or tails decides who goes first.</p>
        <div className="flex flex-wrap justify-center gap-4">
          {(["p1", "p2"] as const).map((p) => (
            <div key={p} className="flex flex-col gap-2 text-sm text-zinc-600">
              <span className="font-semibold text-zinc-800">{playerName(p)}</span>
              <span>Vote for the deck size</span>
              <div className="flex gap-2">
                {DECK_SIZES.map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      setVotes((v) => ({ ...v, [p]: n }));
                      setChoice({ p1: RANDOM_ID, p2: RANDOM_ID }); // decks depend on the size
                    }}
                    className={`rounded-lg border px-4 py-2 font-semibold ${votes[p] === n ? "border-amber-500 bg-amber-100 text-black" : "border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200"}`}
                  >
                    {n} cards
                  </button>
                ))}
              </div>
              {agreedSize && (
                <label className="flex flex-col gap-1">
                  Deck
                  <select
                    value={choice[p]}
                    onChange={(e) => setChoice((c) => ({ ...c, [p]: e.target.value }))}
                    className="rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-zinc-900"
                  >
                    {deckChoices.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                    <option value={RANDOM_ID}>Random {agreedSize}-card deck</option>
                  </select>
                </label>
              )}
            </div>
          ))}
        </div>
        <p className="max-w-md text-center text-sm text-zinc-600">
          {agreedSize
            ? `Agreed: ${agreedSize}-card decks. A player without a saved deck of that size gets a random one.`
            : votes.p1 !== null && votes.p2 !== null
              ? "You voted for different sizes. Both players must agree on the same deck size."
              : "Each player votes. The game starts when both choose the same size."}
        </p>
        {hidden > 0 && (
          <p className="max-w-md text-center text-xs text-zinc-500">
            {hidden} saved deck{hidden > 1 ? "s are" : " is"} not offered: not legal (20+ cards, max 4 copies) or containing cards
            the game can&apos;t play yet. Only decks with exactly the voted size are listed. See the Decks page.
          </p>
        )}
        <button
          onClick={startGame}
          disabled={loading || !agreedSize}
          className="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
        >
          {loading ? "Loading cards…" : "Start game"}
        </button>
        <Link href="/" className="rounded-lg border border-zinc-400 px-5 py-2 text-sm font-semibold hover:bg-zinc-200">
          ← Back to home
        </Link>
        {error && <p className="max-w-md text-center text-sm text-red-600">{error}</p>}
      </main>
    );
  }

  const state = game;
  const actor = seat ?? playerToAct(state);
  /** Hot-seat: always true. Online: only while the game is waiting for this player. */
  const mine = !online || playerToAct(state) === actor;
  const other = OPPONENT[actor];
  const legal = getLegalActions(state, actor);
  const playable = new Set(legal.flatMap((a) => (a.type === "playLand" || a.type === "castCreature" || a.type === "castSpell" ? [a.iid] : [])));
  const possibleAttackers = getPossibleAttackers(state);
  const possibleBlockers = getPossibleBlockers(state);
  // Blocks the rules force ("all creatures able to block it do so") are part of the blocks from the start.
  const blocks = { ...chosenBlocks, ...Object.fromEntries(getForcedBlocks(state).map((f) => [f.blocker, f.attacker])) };
  const attackerIds = state.combat?.attackers.map((a) => a.attacker) ?? [];

  /** Applies an action for `as` (the player to act, unless someone resigns out of turn). */
  /** What paying for this action involves: the life it costs (Phyrexian mana with no mana to match) and the creatures it would tap for mana. */
  function paymentOf(action: Action, who: PlayerId, spare: string[]): { ok: boolean; life: number; ask: string[] } {
    const me = state.players[who];
    let cost: ReturnType<typeof parseManaCost> = null;
    if (action.type === "castSpell" || action.type === "castCreature") {
      const fromYard = action.type === "castSpell" && action.from === "graveyard";
      const card = (fromYard ? me.graveyard : me.hand).find((c) => c.iid === action.iid);
      const def = card ? state.cards[card.defId] : undefined;
      cost = def ? (fromYard ? parseManaCost(parseCard(def).flashback ?? "") : castCostOf(state, who, def)) : null;
    } else if (action.type === "activateAbility") {
      const source = [...me.battlefield.map((p) => p.card), ...me.hand, ...me.graveyard].find((c) => c.iid === action.iid);
      const ability = source ? parseCard(state.cards[source.defId]).activated[action.index] : undefined;
      cost = ability?.mana ? parseManaCost(ability.mana) : null;
    }
    if (!cost) return { ok: true, life: 0, ask: [] };
    const held = spare.length > 0 ? { ...state, players: { ...state.players, [who]: { ...me, spareMana: spare } } } : state;
    const paid = payMana(held, who, cost);
    return paid.ok ? { ok: true, life: paid.life, ask: manaSourcesToConfirm(state, who, paid.tap) } : { ok: false, life: 0, ask: [] };
  }

  /**
   * Applies an action for `as` (the player to act, unless someone resigns out of turn). Before it is applied the player is asked about
   * anything they might not want: life paid for Phyrexian mana, and creatures tapped for mana (which could attack or block instead).
   */
  async function act(action: Action, as: PlayerId = actor, opts: { life?: boolean; mana?: boolean; pointless?: boolean; spare?: string[] } = {}) {
    if (isCombatPlaying() || isPileBusy()) return; // ignore clicks while something is being animated
    const spare = opts.spare ?? [];
    const pay = paymentOf(action, as, spare);
    if (!pay.ok && spare.length > 0) {
      setLifeConfirm(null);
      setError("There is not enough mana without using that card.");
      return;
    }
    const nameOfIid = (iid: string) => {
      const perm = state.players[as].battlefield.find((p) => p.card.iid === iid);
      return perm ? state.cards[perm.card.defId].name : "a card";
    };
    if (!opts.mana && pay.ask.length > 0) {
      const names = pay.ask.map(nameOfIid).join(" and ");
      setLifeConfirm({
        text: `Tap ${names} for mana? It can't attack or block while it is tapped.`,
        options: [
          { label: `Yes, tap ${names}`, go: () => act(action, as, { ...opts, mana: true }) },
          { label: `No, keep ${names} untapped`, go: () => act(action, as, { ...opts, spare: [...spare, ...pay.ask] }) },
        ],
      });
      return;
    }
    if (!opts.life && pay.life > 0) {
      setLifeConfirm({
        text: `This will cost you ${pay.life} life, because you don't have the mana to pay for it. You are at ${state.players[as].life} life.`,
        options: [{ label: "Yes, pay the life", go: () => act(action, as, { ...opts, life: true }) }],
      });
      return;
    }
    // A spell that only affects attacking creatures does nothing when none are attacking.
    if (!opts.pointless && action.type === "castSpell" && !state.combat) {
      const card = state.players[as].hand.find((c) => c.iid === action.iid);
      const spell = card ? parseCard(state.cards[card.defId]).spell : undefined;
      if (card && spell && !spell.modal && spell.effects.length > 0 && spell.effects.every((e) => "what" in e && e.what.t === "attackingCreatures")) {
        setLifeConfirm({
          text: `No creature is attacking right now, so ${state.cards[card.defId].name} would do nothing. Cast it during combat, after attackers are declared.`,
          options: [{ label: "Cast it anyway", go: () => act(action, as, { ...opts, pointless: true }) }],
        });
        return;
      }
    }
    setLifeConfirm(null);
    const held = spare.length > 0 ? { ...state, players: { ...state.players, [as]: { ...state.players[as], spareMana: spare } } } : state;
    if (online) {
      // The server runs the rules: send the action, and the result comes back as an update.
      if (!mine && action.type !== "concede") {
        setError("Wait for your opponent.");
        return;
      }
      netSend("action", { action, ...(spare.length > 0 ? { spare } : {}) });
      setError(null);
      return;
    }
    const r = applyAction(held, as, action);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    r.state.players[as].spareMana = undefined;
    // Combat damage: play the attack on the board as it is now, then show the result.
    if (state.combat && r.events.some((e) => e.type === "combatDamage")) {
      await playCombat(r.events, state.combat.attackers.map((a) => a.attacker));
    }
    await commit(r);
    setError(null);
  }

  /**
   * Shows the result of an action: cards that died fly to the graveyard first, then the new state appears and
   * the cards that were drawn fly out of the library, turn over in the middle and land in the hand.
   */
  async function commit(r: { state: GameState; events: GameEvent[] }) {
    const gone = r.events.flatMap((e) => (e.type === "creatureDied" ? [e.iid] : e.type === "cardsDiscarded" ? e.iids : []));
    await playToGraveyard(gone);
    const viewer = seat ?? playerToAct(r.state);
    // Only the viewer's own cards are animated: the opponent's hand is just a count, so their draw or mulligan
    // would fly across this screen as if it were the viewer's.
    const draws: Draw[] = state.phase === "mulligan" ? [] : r.events.flatMap((e) => {
      const card = e.type === "cardDrawn" && e.player === viewer ? r.state.players[viewer].hand.find((c) => c.iid === e.iid) : undefined;
      return card ? [{ iid: card.iid, owner: viewer, faceUp: true, def: r.state.cards[card.defId] }] : [];
    }).slice(0, 3);
    // A mulligan deals a whole new hand.
    const redeal = r.events.some((e) => e.type === "mulliganTaken" && e.player === viewer);
    const dealt: Draw[] = redeal ? handDraws(r.state) : [];
    // flushSync puts the new cards on the page right away, so they can be hidden before they are ever painted.
    flushSync(() => {
      setGame(r.state);
      setHandHover(null);
      setLog((l) => [...describeEvents(r.events, r.state).reverse(), ...l].slice(0, 60));
      setEndNote(endReason(r.events, r.state));
      // Online: the opponent passed the turn. Said loudly, in case this player looked away while waiting.
      if (online && r.events.some((e) => e.type === "turnStarted" && e.player === viewer)) setTurnSplash((n) => n + 1);
      const told = announcementsFrom(r.events, r.state);
      if (told.length > 0) {
        setAnnouncements((a) => [...a, ...told].slice(-4));
        setHistory((h) => [...h, ...told].slice(-40));
      }
      resetSelection();
    });
    hideDrawn(draws);
    await playDraws(draws);
    if (redeal) {
      hideDrawn(dealt);
      await playDeal(dealt);
    }
  }

  /** The hand of the player looking at the screen, as cards to animate. */
  function handDraws(s: GameState): Draw[] {
    const viewer = seat ?? playerToAct(s);
    return s.players[viewer].hand.map((c) => ({ iid: c.iid, owner: viewer, faceUp: true, def: s.cards[c.defId] }));
  }

  /**
   * Passes through the rest of the turn in one click (used when there is nothing to attack with).
   * Stops early if the player has to make a choice, such as discarding down to seven cards.
   */
  async function endTurn() {
    if (isCombatPlaying() || isPileBusy()) return;
    if (online) {
      if (mine) netSend("endTurn");
      return;
    }
    let s = state;
    const events: GameEvent[] = [];
    for (let i = 0; i < 6 && s.turn === state.turn && !s.winner && s.phase !== "cleanup"; i++) {
      const r = applyAction(s, playerToAct(s), { type: "passPhase" });
      if (!r.ok) {
        setError(r.error);
        break;
      }
      s = r.state;
      events.push(...r.events);
    }
    await commit({ state: s, events });
  }

  /**
   * What the hand should show for a card: castable (green, with a badge), or dimmed with the reason why not.
   * Only while playing normally: during the mulligan and the discard the hand is for choosing cards, not casting.
   */
  function handNotes(defId: string, ok: boolean): { castable?: boolean; dim?: boolean; hint?: string } {
    if (state.phase === "mulligan" || state.phase === "cleanup" || state.pendingPick || state.winner) return {};
    if (ok) return { castable: true };
    const def = state.cards[defId];
    if (def.type === "land") {
      return { dim: true, hint: state.players[actor].landsPlayedThisTurn >= 1 ? "You already played a land this turn." : "You can only play a land in your own main phase." };
    }
    const cost = castCostOf(state, actor, def);
    const paid = cost ? payMana(state, actor, cost, def) : null;
    if (cost && paid && !paid.ok) {
      return { dim: true, hint: paid.missing === "life" ? "Not enough life to pay for this." : paid.missing === "generic" ? `Not enough mana: it costs ${def.manaCost ?? def.cost}.` : `Not enough mana of the right color: it costs ${def.manaCost}.` };
    }
    return { dim: true, hint: "You have the mana, but can't cast it right now (wrong phase, something is on the stack, or it has no legal target)." };
  }

  /** Abilities that exist but can't be used right now, each with the reason, so they can be shown greyed out. */
  function lockedAbilities() {
    if (state.winner || state.pendingPick) return [];
    const out: { key: string; where: "hand" | "battlefield"; label: React.ReactNode; reason: string; help?: string }[] = [];
    const usable = getActivatable(state, actor);
    const hasPriority = !state.priority || state.priority.holder === actor;
    for (const perm of state.players[actor].battlefield) {
      const def = state.cards[perm.card.defId];
      parseCard(def).activated.forEach((ability, index) => {
        if (usable.some((u) => u.iid === perm.card.iid && u.index === index)) return;
        const cost = ability.mana ? parseManaCost(ability.mana) : null;
        const reason = !hasPriority
          ? "wait for your turn to respond"
          : ability.tap && perm.tapped
            ? "it is tapped"
            : ability.tap && perm.summoningSick && def.type === "creature"
              ? "it just arrived (summoning sick)"
              : ability.oncePerTurn && perm.usedAbilities?.includes(index)
                ? "already used this turn"
                : cost && !payMana(state, actor, cost).ok
                  ? "not enough mana"
                  : ability.sorceryOnly
                    ? "only in your main phase with an empty stack"
                    : "can't be used right now";
        out.push({ key: `${perm.card.iid}-${index}`, where: "battlefield", label: <span><span className="font-semibold">{def.name}</span>: {readable(ability.text, def.name)}</span>, reason, help: ability.text });
      });
    }
    const cyclable = getCyclable(state, actor);
    for (const card of state.players[actor].hand) {
      const def = state.cards[card.defId];
      const cycling = parseCard(def).cycling;
      if (!cycling || cyclable.some((c) => c.iid === card.iid)) continue;
      const cost = parseManaCost(cycling);
      out.push({
        key: `cycle-${card.iid}`,
        where: "hand",
        label: <span><span className="font-semibold">Cycle {def.name}</span>: <ManaText text={cycling} /></span>,
        reason: !hasPriority ? "wait for your turn to respond" : cost && !payMana(state, actor, cost).ok ? "not enough mana" : "can't be used right now",
        help: "cycling",
      });
    }
    return out;
  }

  /** Abilities that would change nothing right now (a keyword the creature already has), so the player doesn't waste mana or life. */
  function abilityWarnings(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const perm of state.players[actor].battlefield) {
      parseCard(state.cards[perm.card.defId]).activated.forEach((ability, index) => {
        const grants = ability.effects.filter((e) => e.type === "grant" && e.what.t === "self");
        if (grants.length === 0 || grants.length !== ability.effects.length) return;
        const names = grants.map((e) => (e.type === "grant" ? e.keyword : "")).join(" and ");
        const owned = grants.every((e) => e.type === "grant" && ((perm.tempKeywords ?? []).includes(e.keyword) || (state.cards[perm.card.defId].keywords ?? []).includes(e.keyword)));
        const combatOnly = grants.every((e) => e.type === "grant" && ["trample", "flying", "menace", "first strike", "double strike", "deathtouch", "lifelink", "vigilance", "indestructible", "reach"].includes(e.keyword));
        const def = state.cards[perm.card.defId];
        if (owned) out[`${perm.card.iid}-${index}`] = `already has ${names}: this would change nothing`;
        else if (combatOnly && perm.summoningSick && def.type === "creature" && !(perm.tempKeywords ?? []).includes("haste") && !(def.keywords ?? []).includes("haste") && ["main1", "attackers", "main2", "end"].includes(state.phase) && state.active === actor) {
          out[`${perm.card.iid}-${index}`] = `it just arrived and can't attack this turn: ${names} won't matter until your next turn`;
        } else if (combatOnly && ["main2", "end", "cleanup"].includes(state.phase) && state.active === actor) {
          out[`${perm.card.iid}-${index}`] = `combat is over this turn: ${names} would change nothing`;
        }
      });
    }
    return out;
  }

  function clickHandCard(iid: string, defId: string) {
    if (state.phase === "mulligan" && mulligansTaken === 0) return; // keep or mulligan: nothing to pick yet
    if (state.phase === "mulligan" || state.phase === "cleanup") {
      // Choosing cards to put on the bottom (mulligan) or to discard (cleanup).
      setHandPick((p) => (p.includes(iid) ? p.filter((x) => x !== iid) : [...p, iid]));
      return;
    }
    if (state.cards[defId].type === "land") {
      act({ type: "playLand", iid });
      return;
    }
    const castable = getCastable(state, actor).find((c) => c.iid === iid && c.zone === undefined);
    if (!castable) {
      act({ type: "castSpell", iid, targets: [] }); // not castable now: the engine says why
      return;
    }
    advance({ iid, name: state.cards[defId].name, castable });
  }

  type CastPlan = NonNullable<typeof plan>;

  /** Moves a spell on to whatever it still needs: modes, the kicker, X, targets, and finally the cast itself. */
  function advance(p: CastPlan) {
    const c = p.castable;
    setPlan(p);
    if (c.modal && p.modes === undefined) return; // the mode panel is shown
    if (c.kicker !== undefined && p.kicked === undefined) return; // the kicker panel is shown
    if (c.maxX !== undefined && p.x === undefined) {
      setXValue(c.maxX);
      return;
    }
    if (c.sacrifice && p.sacrifice === undefined) return; // the sacrifice panel is shown
    const specs = c.modal ? (p.modes ?? []).flatMap((m) => c.modal!.modes[m].specs) : c.specs;
    const build = (targets: TargetChoice[]): Action => ({
      type: "castSpell",
      iid: p.iid,
      targets,
      ...(p.from ? { from: p.from } : {}),
      ...(p.modes ? { modes: p.modes } : {}),
      ...(p.kicked ? { kicked: true } : {}),
      ...(p.x !== undefined ? { x: p.x } : {}),
      ...(p.sacrifice ? { sacrifice: p.sacrifice } : {}),
    });
    const title = p.name + (p.x !== undefined && c.maxX !== undefined ? ` (X = ${p.x})` : "") + (p.kicked ? " (kicked)" : "");
    setPlan(null);
    if (specs.length === 0) {
      act(build([]));
    } else {
      setChosen([]);
      // what the spell does, from the card itself, shown while choosing
      const spellCard = Object.values(state.players).flatMap((pl) => [...pl.hand, ...pl.graveyard, ...pl.exile]).find((card) => card.iid === p.iid);
      const spellText = spellCard ? state.cards[spellCard.defId].text : undefined;
      setTargeting({ title, specs, build, detail: spellText ? readable(spellText, p.name) : undefined });
    }
  }

  function useLoyalty(a: { iid: string; index: number; specs: TargetSpec[]; text: string }) {
    if (a.specs.length === 0) {
      act({ type: "loyalty", iid: a.iid, index: a.index, targets: [] });
    } else {
      setChosen([]);
      setTargeting({ title: readable(a.text.replace(/^[+-]?\d+: /, ""), state.cards[Object.values(state.players).flatMap((p) => p.battlefield).find((x) => x.card.iid === a.iid)!.card.defId].name), specs: a.specs, build: (targets) => ({ type: "loyalty", iid: a.iid, index: a.index, targets }) });
    }
  }

  /** The name of a card wherever it is: on the battlefield, or in a hand or graveyard (some abilities work from there). */
  function cardNameAnywhere(iid: string): string {
    for (const p of Object.values(state.players)) {
      const card = [...p.battlefield.map((x) => x.card), ...p.hand, ...p.graveyard].find((c) => c.iid === iid);
      if (card) return state.cards[card.defId].name;
    }
    return "a card";
  }

  function startAbility(a: Activatable, payWith?: string) {
    // "Discard a card" / "Sacrifice a creature" as a cost: ask which one first.
    if (a.costChoices && payWith === undefined) {
      setLifeConfirm({
        text: `${cardNameAnywhere(a.iid)}: choose ${a.costLabel ?? "a card"}`,
        options: a.costChoices.map((iid) => ({ label: cardNameAnywhere(iid), go: () => startAbility(a, iid) })),
      });
      return;
    }
    setLifeConfirm(null);
    const extra = payWith === undefined ? {} : { payWith };
    if (a.specs.length === 0) {
      act({ type: "activateAbility", iid: a.iid, index: a.index, targets: [], ...extra });
    } else {
      setChosen([]);
      setTargeting({ title: readable(a.text, cardNameAnywhere(a.iid)), specs: a.specs, build: (targets) => ({ type: "activateAbility", iid: a.iid, index: a.index, targets, ...extra }) });
    }
  }

  /** One more target picked: when every need is filled, the spell, ability or trigger is put on the stack. */
  function pickTarget(t: TargetChoice) {
    const ctx = state.pendingChoice ? { specs: state.pendingChoice.specs, build: (targets: TargetChoice[]) => ({ type: "chooseTargets", targets }) as Action } : targeting;
    if (!ctx) return;
    setAimed(null);
    const next = [...chosen, t];
    if (next.length < ctx.specs.length) setChosen(next);
    else act(ctx.build(next));
  }

  // While choosing a target, every creature or permanent that can be chosen glows, and clicking the card itself picks it.
  const targetingSpec = (state.pendingChoice ? state.pendingChoice.specs : targeting?.specs)?.[chosen.length];
  const clickableTargets = new Set<string>(
    targetingSpec
      ? legalTargets(state, targetingSpec, state.pendingChoice ? state.pendingChoice.item.controller : actor).flatMap((t) => (t.kind === "permanent" ? [t.iid] : []))
      : [],
  );

  /** Returns click handler + ring styling for a permanent, depending on the current step. */
  function interaction(owner: PlayerId, perm: Permanent): { onClick?: () => void; ring: string; note?: string; combat?: { tone: string; label: string; why?: string }; dim?: boolean } {
    if (online && !mine) return { ring: "" };
    const iid = perm.card.iid;
    const def = state.cards[perm.card.defId];
    const isCreature = def.type === "creature" || perm.crewed === true;
    if (clickableTargets.has(iid) && aimed?.kind === "permanent" && aimed.iid === iid) {
      return { ring: "ring-4 ring-amber-400", combat: { tone: "block", label: "🎯 Confirm the target", why: "Press Confirm target in the panel, or click another card." }, onClick: () => setAimed(null) };
    }
    if (clickableTargets.has(iid)) {
      return { ring: "ring-4 ring-sky-400", combat: { tone: "block", label: "🎯 Click to target", why: "Choose this as the target." }, onClick: () => setAimed({ kind: "permanent", iid }) };
    }
    if (clickableTargets.size > 0) return { ring: "", dim: true }; // not a legal target right now
    if (state.phase === "attackers" && owner === actor) {
      if (possibleAttackers.includes(iid)) {
        const on = attacking.includes(iid);
        return {
          ring: "",
          combat: on ? { tone: "threat", label: "⚔ Attacking", why: "Click to take it out of the attack." } : attackHint(state, actor, perm),
          onClick: () => setAttacking((a) => (on ? a.filter((x) => x !== iid) : [...a, iid])),
        };
      }
      if (isCreature) return { ring: "", dim: true }; // can't attack this turn (tapped, just arrived, defender...)
    }
    if (state.phase === "blockers") {
      if (owner === actor && possibleBlockers.includes(iid)) {
        if (getForcedBlocks(state).some((f) => f.blocker === iid)) return { ring: "", combat: { tone: "blocked", label: "🛡 Must block", why: "An attacker's text forces every creature able to block it to do so." } };
        const target = blocks[iid];
        return {
          ring: picked === iid ? "ring-4 ring-sky-400" : "",
          combat: target ? { tone: "blocked", label: "🛡 Blocking", why: "Click to stop blocking with it." } : picked === iid ? { tone: "block", label: "Now click an attacker" } : blockHint(state, actor, perm),
          onClick: () => {
            if (target) {
              setBlocks((b) => Object.fromEntries(Object.entries(b).filter(([blocker]) => blocker !== iid)));
            } else {
              setPicked(picked === iid ? null : iid);
            }
          },
        };
      }
      if (owner === actor && isCreature) return { ring: "", dim: true }; // can't block
      if (owner !== actor && attackerIds.includes(iid)) {
        const blockedBy = Object.values(blocks).filter((a) => a === iid).length;
        return {
          ring: picked ? "ring-4 ring-red-400" : "",
          combat: blockedBy ? { tone: "blocked", label: `Blocked ×${blockedBy}` } : { tone: "threat", label: picked ? "Block this one" : "⚔ Attacking", why: `Deals ${powerOf(state, perm)} damage if nobody blocks it.` },
          onClick: picked
            ? () => {
                setBlocks((b) => ({ ...b, [picked]: iid }));
                setPicked(null);
              }
            : undefined,
        };
      }
    }
    return { ring: "" };
  }

  /** Is this creature in the combat zone? Chosen or declared attackers, and chosen or declared blockers, leave their row and stand there. */
  function inCombat(owner: PlayerId, perm: Permanent): boolean {
    const iid = perm.card.iid;
    if (attackerIds.includes(iid) || state.combat?.attackers.some((a) => a.blockers.includes(iid))) return true;
    if (owner === actor && state.phase === "attackers" && attacking.includes(iid)) return true;
    if (owner === actor && state.phase === "blockers" && blocks[iid]) return true;
    return false;
  }

  const mulligansTaken = state.opening?.taken[actor] ?? 0;
  const excess = Math.max(0, state.players[actor].hand.length - MAX_HAND_SIZE);
  const damageNeeded = state.phase === "damage" ? getDamageAssignments(state) : [];
  const effectiveAssign = (attacker: string) => assign[attacker] ?? suggestDamageAssignment(state, attacker);

  const primary = (() => {
    if (state.winner || state.priority || state.pendingChoice || state.pendingPick || !mine) return null;
    if (state.phase === "mulligan") {
      return {
        label: mulligansTaken ? `Keep and bottom ${handPick.length}/${mulligansTaken}` : "Keep hand",
        action: { type: "keepHand", bottom: handPick } as Action,
      };
    }
    if (state.phase === "cleanup") {
      return { label: `Discard ${handPick.length}/${excess}`, action: { type: "discard", iids: handPick } as Action };
    }
    if (state.phase === "damage") {
      const assignments = damageNeeded.flatMap((d) =>
        [...d.blockers, ...(d.trampleTo ? [d.trampleTo] : [])].map((blocker) => ({
          attacker: d.attacker,
          blocker,
          amount: effectiveAssign(d.attacker)[blocker] ?? 0,
        })),
      );
      return { label: "Deal damage", action: { type: "assignDamage", assignments } as Action };
    }
    if (state.phase === "attackers") {
      return attacking.length
        ? {
            label: `Attack with ${attacking.length}`,
            action: { type: "declareAttackers", attackers: attacking, ...(Object.keys(attackTargets).length ? { targets: Object.fromEntries(Object.entries(attackTargets).filter(([a]) => attacking.includes(a))) } : {}) } as Action,
          }
        : { label: "Skip attack", action: { type: "passPhase" } as Action };
    }
    if (state.phase === "blockers") {
      // Blocks the rules demand are already part of `blocks`.
      const list = Object.entries(blocks).map(([blocker, attacker]) => ({ blocker, attacker }));
      return {
        label: list.length ? `Confirm ${list.length} block${list.length > 1 ? "s" : ""}` : "No blocks",
        action: { type: "declareBlockers", blocks: list } as Action,
      };
    }
    return { label: PASS_LABEL[state.phase], action: { type: "passPhase" } as Action };
  })();

  // In the first main phase, "Go to combat" is only available once the player has a card on their battlefield.
  const noCombatYet = state.phase === "main1" && state.players[actor].battlefield.length === 0;
  // When the only thing left to play is a land (or nothing at all), the button says "Pass turn".
  const onlyLandsLeft =
    (state.phase === "main1" || state.phase === "main2") &&
    [...playable].every((iid) => state.cards[state.players[actor].hand.find((c) => c.iid === iid)?.defId ?? ""]?.type === "land");
  // "End turn" skips the rest of the player's own turn at any point before combat or after it.
  const showEndTurn = mine && !state.priority && !state.pendingChoice && !state.pendingPick && (state.phase === "main1" || state.phase === "attackers" || state.phase === "main2");
  const noCombatTip =
    "You have no cards on your battlefield yet, so there is nothing to attack with. Play a land or a creature from your hand first, or end your turn.";

  // What the two opening-hand buttons do, shown when the mouse is over them.
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const keepHandTip = mulligansTaken
    ? `Keep this hand and start the game. You took ${plural(mulligansTaken, "mulligan")}, so first click ${plural(mulligansTaken, "card")} in your hand to put on the bottom of your library. You will start with ${STARTING_HAND - mulligansTaken} cards.`
    : `Keep your starting ${STARTING_HAND} cards and start the game. Choose this if the hand has a good mix of lands and creatures you can cast.`;
  const mulliganTip =
    `Don't like this hand, for example too few lands or nothing you can cast? Shuffle it back into your library and draw ${STARTING_HAND} new cards. ` +
    `The catch: when you finally keep, you put one card per mulligan on the bottom of your library, so you start with fewer cards (${STARTING_HAND}, then ${STARTING_HAND - 1}, then ${STARTING_HAND - 2}...).` +
    (mulligansTaken ? ` You have taken ${mulligansTaken} so far; another would leave you with ${STARTING_HAND - mulligansTaken - 1} cards.` : "");

  const hint =
    online && !mine && !state.winner
      ? `Waiting for ${playerName(playerToAct(state))}…`
      : state.pendingPick
      ? "Choose a card."
      : state.pendingChoice
      ? "Choose a target for the triggered ability."
      : state.priority
        ? state.stack.length === 0
          ? "Before combat damage: cast an instant or use an ability, or pass to continue."
          : "Something is on the stack. Respond or pass."
        : state.phase === "mulligan"
      ? mulligansTaken
        ? `Click ${mulligansTaken} card${mulligansTaken > 1 ? "s" : ""} in your hand to put on the bottom of your library, then keep.`
        : "Keep this hand, or take a mulligan: draw 7 new cards, then bottom one."
      : state.phase === "cleanup"
        ? `You have too many cards. Click ${excess} to discard.`
        : state.phase === "damage"
          ? "Your attacker was blocked by several creatures: divide its damage among them."
          : state.phase === "attackers"
            ? "Glowing creatures can attack: click one to move it to the attack zone. ★ free hit · ✓ safe · ⚠ could die."
            : state.phase === "blockers"
              ? "Click a glowing creature, then the attacker to block (or use the panel below). ★ great block · ✓ safe · ⚔ trade · 💔 chump. Then confirm."
              : "Click a card in your hand to play it.";

  const showHand = state.players[actor].hand;
  /** Shows the card big next to the element the mouse is over: above it when there is room, otherwise below. */
  function showPreview(def: CardDef, el: HTMLElement) {
    const r = el.getBoundingClientRect();
    const h = HAND_ZOOM_W * 1.4;
    const top = r.top - 8 - h >= 8 ? r.top - 8 - h : Math.min(r.bottom + 8, window.innerHeight - h - 8);
    setHandHover({ def, left: Math.min(Math.max(8, r.left + r.width / 2 - HAND_ZOOM_W / 2), window.innerWidth - HAND_ZOOM_W - 8), top: Math.max(8, top) });
  }
  // Everything that can be done with abilities right now. It lives in a pop-up (the button is in the command bar) so it doesn't take board space.
  const abilityList = {
    abilities: getActivatable(state, actor),
    cycles: getCyclable(state, actor),
    crews: getCrewable(state, actor),
    loyalty: getLoyaltyAbilities(state, actor),
    // Spells that can be cast from the graveyard (flashback) or from exile ("you may play that card"), and lands that can be played from exile.
    flashbacks: getCastable(state, actor)
      .filter((c) => c.zone === "graveyard" || c.zone === "exile")
      .map((c) => {
        const card = [...state.players[actor].graveyard, ...state.players[actor].exile].find((x) => x.iid === c.iid)!;
        const def = state.cards[card.defId];
        return { iid: c.iid, name: def.name, cost: c.zone === "exile" ? (def.manaCost ?? "") : (parseCard(def).flashback ?? ""), zone: c.zone as "graveyard" | "exile" };
      }),
    exileLands: getLegalActions(state, actor).flatMap((a) => (a.type === "playLand" && state.players[actor].exile.some((c) => c.iid === a.iid) ? [{ iid: a.iid, name: state.cards[state.players[actor].exile.find((c) => c.iid === a.iid)!.defId].name }] : [])),
  };
  const abilityCount = abilityList.abilities.length + abilityList.cycles.length + abilityList.crews.length + abilityList.loyalty.length + abilityList.flashbacks.length + abilityList.exileLands.length;
  const abilityLocked = lockedAbilities().length;
  const runAbility = startAbility;
  const runLoyalty = useLoyalty;
  const inspect = (def: Inspected["def"], status?: string[]) => setInspected({ def, status });
  // Creatures go in the big row; lands, artifacts and other permanents share the small one.
  const cardsIn = (id: PlayerId, type: "land" | "creature") =>
    state.players[id].battlefield.filter((p) => !inCombat(id, p)).filter((p) => (state.cards[p.card.defId].type === "creature" || p.crewed === true) === (type === "creature"));

  const inCombatStep = state.phase === "attackers" || state.phase === "blockers" || state.phase === "damage";

  /** The combat zone of one side: attackers (the side whose turn it is) or blockers. Shown while combat is being set up or is on the board. */
  const combatZone = (id: PlayerId) => {
    const perms = state.players[id].battlefield.filter((p) => inCombat(id, p));
    const attackingSide = id === state.active;
    const setup = mine && (state.phase === "attackers" || state.phase === "blockers") && id === actor;
    if (perms.length === 0 && !setup) return null;
    return (
      <div className={`flex flex-col gap-1 rounded-lg border-2 border-dashed px-2 py-1 ${attackingSide ? "border-red-400 bg-[#450a0a]/45" : "border-sky-400 bg-[#082f49]/45"}`}>
        <div className={`flex items-center gap-2 text-[10px] font-extrabold uppercase font-display tracking-widest ${attackingSide ? "text-[#fecaca]" : "text-[#bae6fd]"}`}>
          {attackingSide ? "⚔ Attack zone" : "🛡 Block zone"}
          {perms.length > 0 && <span>({perms.length})</span>}
          {perms.length === 0 && <span className="font-medium normal-case tracking-normal text-slate-200">{attackingSide ? "Click a glowing creature to move it here and attack with it." : "Click one of your creatures, then the attacker it should block."}</span>}
        </div>
        {perms.length > 0 && <Lane perms={perms} state={state} interaction={(p) => interaction(id, p)} size="md" onInspect={inspect} onZoom={setZoomed} attackingIds={attackerIds} onPreview={showPreview} onUnpreview={() => setHandHover(null)} />}
      </div>
    );
  };

  return (
    <main
      className="battlefield-bg flex flex-col gap-2 p-2 text-zinc-900 lg:[--card-h:clamp(74px,11.8dvh,150px)] lg:has-[.action-box>*]:[--card-h:clamp(58px,9dvh,110px)] lg:h-[calc(100dvh-2.5rem)] lg:grid lg:grid-cols-[15rem_minmax(0,1fr)_17rem] lg:overflow-hidden"
      style={{ "--bf-image": background.css, "--bf-dim": background.dim, ...(state.phase === "attackers" ? { "--card-h": "clamp(60px, 10.5dvh, 130px)" } : state.phase === "blockers" ? { "--card-h": "clamp(56px, 9dvh, 110px)" } : {}) } as React.CSSProperties}
    >
      {/* Left: players, chat, log */}
      <aside className="flex flex-col gap-2 lg:min-h-0 lg:overflow-y-auto">
        <button
          onClick={() => setLookOpen(true)}
          className="flex w-full items-center justify-between rounded-xl border border-white/40 bg-slate-950/55 px-3 py-2 text-left font-display text-xs font-bold uppercase tracking-wide text-white shadow-sm hover:bg-slate-900/70"
        >
          <span>🎴 Sleeves &amp; playmat</span>
          <span aria-hidden="true" className="flex gap-1">
            {(["p1", "p2"] as const).map((id) => (
              <span key={id} className="h-4 w-3 rounded-[2px] border border-black/60" style={{ background: look.sleeve(id).css }} />
            ))}
          </span>
        </button>
        <BackgroundPicker bg={background} />
        <PlayedThisTurn items={history.filter((h) => h.turn === state.turn)} state={state} onZoom={(defId) => setZoomed(state.cards[defId])} />
        <ChatPanel
          messages={chat}
          as={actor}
          onSend={(text) => (online ? netSend("chat", { text }) : setChat((c) => [...c, { id: c.length, from: actor, text }]))}
        />
        <LogPanel lines={log} />
        {/* You: bottom left */}
        <div className="shrink-0">
          <PlayersPanel state={state} order={[actor]} actor={actor} onResign={setResigning} heading="You" />
        </div>
      </aside>

      {lookOpen && <AppearanceDialog look={look} cursor={{ on: cursorOn, set: setCursorOn }} onClose={() => setLookOpen(false)} first={actor} />}

      {/* Center: the battle */}
      <section className="flex flex-col gap-1.5 lg:min-h-0">
        <Side
          label={`${playerName(other)}'s battlefield`}
          player={other}
          grow
          mat={look.mat(other).css}
          overlay={<Announcements items={announcements.filter((a) => a.player === other)} onClose={(id) => setAnnouncements((l) => l.filter((x) => x.id !== id))} />}
          zones={
            <>
              <Pile state={state} owner={other} kind="library" compact deckName={deckNames[other]} sleeve={look.sleeve(other)} />
              <Pile state={state} owner={other} kind="graveyard" compact onOpen={() => setViewingYard({ owner: other, zone: "graveyard" })} />
              <Pile state={state} owner={other} kind="exile" onOpen={() => setViewingYard({ owner: other, zone: "exile" })} />
            </>
          }
        >
          <Lane perms={cardsIn(other, "land")} state={state} interaction={(p) => interaction(other, p)} size="sm" onInspect={inspect} onZoom={setZoomed} attackingIds={attackerIds} onPreview={showPreview} onUnpreview={() => setHandHover(null)} />
          <LandsDivider landsBelow={false} onMat />
          {(() => {
            const zone = combatZone(other);
            return (
              <div className="flex items-stretch gap-2">
                <div className="min-w-0 flex-1"><Lane perms={cardsIn(other, "creature")} state={state} interaction={(p) => interaction(other, p)} size="md" collapseEmpty={inCombatStep} onInspect={inspect} onZoom={setZoomed} attackingIds={attackerIds} onPreview={showPreview} onUnpreview={() => setHandHover(null)} /></div>
                {zone && <div className="max-w-[60%] shrink-0">{zone}</div>}
              </div>
            );
          })()}
        </Side>

        {/* The command bar: whose turn, which step, and the one big button to move on. */}
        <section className={`shrink-0 overflow-hidden rounded-xl border bg-white shadow-md ${PLAYER_STYLE[actor].border}`}>
          <div className={`h-1 bg-gradient-to-r ${PLAYER_STYLE[actor].gradient}`} />
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 px-3 py-1.5">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-slate-900 px-2.5 py-0.5 text-center text-white shadow">
                <div className="text-[8px] uppercase font-display tracking-widest text-zinc-400">Turn</div>
                <div className="text-lg font-extrabold leading-none">{state.turn}</div>
              </div>
              <div className="leading-tight">
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${PLAYER_STYLE[actor].chip}`}>{playerName(actor)}</span>
                <div className="mt-0.5 text-xs font-semibold text-zinc-800">{PHASE_TEXT[state.phase] ?? "to act"}</div>
              </div>
            </div>
            <ol className="flex flex-wrap items-center gap-1 text-xs">
              {(() => {
                const steps = PHASES.filter(([id]) => id !== "mulligan" || state.phase === "mulligan");
                const at = steps.findIndex(([id]) => id === state.phase);
                return steps.map(([id, label], i) => (
                  <li
                    key={id}
                    className={`font-display flex items-center gap-1 rounded-full px-2 py-0.5 text-[12.5px] font-semibold tracking-wide transition ${
                      i === at ? "bg-amber-400 text-black shadow ring-2 ring-amber-300" : i < at ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-400"
                    }`}
                  >
                    {i < at && <span aria-hidden="true">✓</span>}
                    {label}
                  </li>
                ));
              })()}
            </ol>
            <div className="ml-auto flex flex-wrap items-center gap-2">
          {primary &&
            (() => {
              const skipping = state.phase === "attackers" && attacking.length === 0 && possibleAttackers.length > 0;
              if (skipping && confirmSkip)
                return (
                  <span role="group" aria-label="Skip attack?" className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-amber-400 bg-amber-50 px-2 py-1 text-sm font-semibold text-amber-900">
                    Skip attack? Your creatures won&apos;t attack this turn.
                    <button onClick={() => act(primary.action)} className="rounded-lg bg-gradient-to-b from-amber-300 to-amber-500 px-3 py-1 font-extrabold text-black">
                      Yes, skip
                    </button>
                    <button onClick={() => setConfirmSkip(false)} className="rounded-lg border border-zinc-400 bg-white px-3 py-1 hover:bg-zinc-100">
                      Back
                    </button>
                  </span>
                );
              const button = (
                <button
                  onClick={() => (skipping ? setConfirmSkip(true) : act(primary.action))}
                  disabled={noCombatYet}
                  className="rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 px-4 py-1.5 text-sm font-extrabold text-black shadow-md shadow-amber-500/40 transition hover:-translate-y-0.5 hover:shadow-lg active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0"
                >
                  {primary.label}
                </button>
              );
              if (state.phase === "mulligan") return <Tip text={keepHandTip}>{button}</Tip>;
              if (noCombatYet) return <Tip text={noCombatTip}>{button}</Tip>;
              return button;
            })()}
          {showEndTurn && !state.winner && (
            <Tip text={onlyLandsLeft ? "Nothing but lands left to play: skip the rest of this turn and pass it to your opponent." : "Skip the rest of this turn and pass it to your opponent."}>
              <button onClick={endTurn} className="rounded-xl border-2 border-zinc-300 bg-white px-3 py-1 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50">
                {onlyLandsLeft ? "Pass turn" : "End turn"}
              </button>
            </Tip>
          )}
          {mine && state.phase === "mulligan" && (
            <Tip text={mulliganTip}>
              <button
                onClick={() => act({ type: "mulligan" })}
                disabled={mulligansTaken >= MAX_MULLIGANS}
                className="rounded-xl border-2 border-indigo-300 bg-white px-3 py-1 text-sm font-semibold text-indigo-800 transition hover:bg-indigo-50 disabled:opacity-40"
              >
                Mulligan
              </button>
            </Tip>
          )}
            </div>
          </div>
        </section>

        {/* What to do now, in the color of the step. */}
        {!state.winner && (() => {
          const mode: BannerMode = state.pendingPick || state.pendingChoice ? "choice" : state.priority ? "stack" : state.phase === "attackers" ? "attack" : state.phase === "blockers" ? "block" : state.phase === "damage" ? "damage" : state.phase === "mulligan" ? "mulligan" : state.phase === "cleanup" ? "cleanup" : "main";
          const b = BANNER[mode];
          return (
            <div className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-1 shadow-sm ${b.box}`}>
              <span className="text-lg" aria-hidden="true">
                {b.icon}
              </span>
              <div className="min-w-0 flex-1 text-xs leading-snug">
                <span className="mr-2 text-[10px] font-extrabold uppercase font-display tracking-widest opacity-70">{b.label}</span>
                <span className="font-medium">{hint}</span>
              </div>
              {error && (
                <span className="rounded-lg bg-red-600 px-3 py-1 text-sm font-semibold text-white shadow">
                  <ManaText text={error} />
                </span>
              )}
              <div className="flex shrink-0 items-center gap-2">
          {state.phase !== "mulligan" && (() => {
            const played = state.players[actor].landsPlayedThisTurn;
            const used = played >= MAX_LANDS_PER_TURN;
            const hasLand = state.players[actor].hand.some((c) => state.cards[c.defId].type === "land");
            return (
              <Tip text={used ? `${playerName(actor)} already played a land this turn. Only ${MAX_LANDS_PER_TURN} land can be played per turn.` : `You can still play ${MAX_LANDS_PER_TURN - played} land this turn${hasLand ? "" : " (but there is no land in your hand)"}.`}>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${used ? "bg-zinc-300 text-zinc-700" : hasLand ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-400" : "bg-zinc-100 text-zinc-500"}`}>
                  <i className="ms ms-land" aria-hidden="true" />
                  Land played: {played}/{MAX_LANDS_PER_TURN} {used ? "✓" : ""}
                </span>
              </Tip>
            );
          })()}
            {state.phase !== "mulligan" && (abilityCount > 0 || abilityLocked > 0) && (
              <Tip text={abilityCount > 0 ? "Open the list of abilities you can use right now." : "Abilities that can't be used yet, and why."}>
                <button
                  onClick={() => setAbilitiesOpen(true)}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${abilityCount > 0 ? "bg-emerald-500 text-white shadow ring-2 ring-emerald-300" : "bg-zinc-100 text-zinc-500 ring-1 ring-zinc-300"}`}
                >
                  ⚡ Abilities{abilityCount > 0 ? ` (${abilityCount})` : ""}
                </button>
              </Tip>
            )}
              </div>
            </div>
          );
        })()}

        {/* Panels that appear while something needs an answer. They share a box that scrolls on its own, so the board never moves. */}
        <div className="action-box flex max-h-[34dvh] shrink-0 flex-col gap-1.5 overflow-y-auto empty:hidden">
        {mine && state.phase === "blockers" && !state.priority && !state.pendingChoice && !state.pendingPick && <BlockPanel state={state} actor={actor} blocks={blocks} onChange={(b) => { setBlocks(b); setPicked(null); }} />}

        {state.phase === "attackers" && attacking.length > 0 && state.players[other].battlefield.some((p) => state.cards[p.card.defId].type === "planeswalker") && (
          <section className="flex flex-col gap-2 rounded-lg border border-red-400/60 bg-red-50 p-3">
            <h2 className="text-sm font-semibold text-red-800">What does each attacker attack?</h2>
            {attacking.map((iid) => {
              const attacker = state.players[actor].battlefield.find((p) => p.card.iid === iid)!;
              return (
                <label key={iid} className="flex items-center gap-2 text-sm">
                  <span className="w-40 truncate font-semibold">{state.cards[attacker.card.defId].name}</span>
                  <select
                    value={attackTargets[iid] ?? ""}
                    onChange={(e) => setAttackTargets((t) => (e.target.value ? { ...t, [iid]: e.target.value } : Object.fromEntries(Object.entries(t).filter(([k]) => k !== iid))))}
                    className="rounded border border-zinc-300 bg-white px-2 py-1"
                  >
                    <option value="">{playerName(other)}</option>
                    {state.players[other].battlefield
                      .filter((p) => state.cards[p.card.defId].type === "planeswalker")
                      .map((p) => (
                        <option key={p.card.iid} value={p.card.iid}>
                          {state.cards[p.card.defId].name} (loyalty {p.loyalty})
                        </option>
                      ))}
                  </select>
                </label>
              );
            })}
          </section>
        )}

        <StackPanel state={state} actor={actor} onPass={() => act({ type: "passPriority" })} waiting={online && !mine ? `Waiting for ${playerName(playerToAct(state))} to ${state.pendingPick || state.pendingChoice ? "choose" : "respond"}…` : undefined} />

        {lifeConfirm && (
          <ChoicePanel
            title={lifeConfirm.text}
            options={[...lifeConfirm.options.map((o) => ({ label: o.label, onPick: o.go })), { label: "Cancel", onPick: () => setLifeConfirm(null) }]}
            onCancel={() => setLifeConfirm(null)}
          />
        )}
        {plan?.castable.modal && plan.modes === undefined && (
          <ChoicePanel
            title={`${plan.name}: choose ${plan.castable.modal.max === 1 ? "one" : "one or both"}`}
            options={plan.castable.modal.modes.map((m, i) => ({
              label: <ManaText text={m.text} />,
              disabled: !m.available,
              onPick: () => advance({ ...plan, modes: [i] }),
            }))}
            multi={
              plan.castable.modal.max > 1
                ? {
                    selected: modePick,
                    onToggle: (i) => setModePick((sel) => (sel.includes(i) ? sel.filter((x) => x !== i) : sel.length < plan.castable.modal!.max ? [...sel, i] : sel)),
                    onDone: () => advance({ ...plan, modes: [...modePick].sort((a, b) => a - b) }),
                  }
                : undefined
            }
            onCancel={() => resetSelection()}
          />
        )}
        {plan && (!plan.castable.modal || plan.modes !== undefined) && plan.castable.kicker !== undefined && plan.kicked === undefined && (
          <ChoicePanel
            title={`${plan.name} has a kicker`}
            options={[
              { label: "Cast it normally", onPick: () => advance({ ...plan, kicked: false }) },
              { label: <>Cast it kicked, paying the extra <ManaText text={plan.castable.kicker ?? ""} /></>, onPick: () => advance({ ...plan, kicked: true }) },
            ]}
            onCancel={() => resetSelection()}
          />
        )}
        {plan && (!plan.castable.modal || plan.modes !== undefined) && (plan.castable.kicker === undefined || plan.kicked !== undefined) && (plan.castable.maxX === undefined || plan.x !== undefined) && plan.castable.sacrifice && plan.sacrifice === undefined && (
          <ChoicePanel
            title={`${plan.name}: choose a creature to sacrifice (an additional cost)`}
            options={plan.castable.sacrifice.map((iid) => {
              const perm = state.players[actor].battlefield.find((p) => p.card.iid === iid)!;
              return { label: `${state.cards[perm.card.defId].name} (${powerOf(state, perm)}/${toughnessOf(state, perm)})`, onPick: () => advance({ ...plan, sacrifice: iid }) };
            })}
            onCancel={() => resetSelection()}
          />
        )}
        {plan && (!plan.castable.modal || plan.modes !== undefined) && (plan.castable.kicker === undefined || plan.kicked !== undefined) && plan.castable.maxX !== undefined && plan.x === undefined && (
          <XPanel
            name={plan.name}
            max={plan.castable.maxX}
            x={xValue}
            onChange={(x) => setXValue(Math.min(plan.castable.maxX ?? 0, Math.max(0, x)))}
            onCast={() => advance({ ...plan, x: xValue })}
            onCancel={() => resetSelection()}
          />
        )}

        {mine && <PickPanel state={state} onPick={(iid) => act({ type: "pick", iid })} onZoom={setZoomed} />}
        {online && !mine && <ResolvingNotice state={state} onZoom={setZoomed} />}

        {mine && (state.pendingChoice || targeting) && (
          <TargetPanel
            state={state}
            controller={actor}
            title={state.pendingChoice ? `${state.pendingChoice.item.sourceName}: triggered ability` : (targeting?.title ?? "")}
            detail={state.pendingChoice ? readable(state.pendingChoice.item.text, state.pendingChoice.item.sourceName) : targeting?.detail}
            specs={state.pendingChoice ? state.pendingChoice.specs : (targeting?.specs ?? [])}
            chosen={chosen}
            aimed={aimed}
            onAim={setAimed}
            onPick={pickTarget}
            onCancel={state.pendingChoice ? undefined : () => resetSelection()}
          />
        )}

        {mine && damageNeeded.length > 0 && (
          <DamagePanel
            state={state}
            needed={damageNeeded}
            effective={effectiveAssign}
            onShift={(attacker, from, to) =>
              setAssign((a) => {
                const cur = a[attacker] ?? suggestDamageAssignment(state, attacker);
                return { ...a, [attacker]: { ...cur, [from]: (cur[from] ?? 0) - 1, [to]: (cur[to] ?? 0) + 1 } };
              })
            }
          />
        )}
        </div>

        <Side
          label={`${playerName(actor)}'s battlefield`}
          player={actor}
          grow
          mat={look.mat(actor).css}
          zones={
            <>
              <Pile state={state} owner={actor} kind="exile" onOpen={() => setViewingYard({ owner: actor, zone: "exile" })} />
              <Pile state={state} owner={actor} kind="graveyard" compact onOpen={() => setViewingYard({ owner: actor, zone: "graveyard" })} />
              <Pile state={state} owner={actor} kind="library" compact deckName={deckNames[actor]} sleeve={look.sleeve(actor)} />
            </>
          }
        >
          {(() => {
            const zone = combatZone(actor);
            return (
              <div className="flex items-stretch gap-2">
                {zone && <div className="max-w-[60%] shrink-0">{zone}</div>}
                <div className="min-w-0 flex-1"><Lane perms={cardsIn(actor, "creature")} state={state} interaction={(p) => interaction(actor, p)} size="md" collapseEmpty={inCombatStep} onInspect={inspect} onZoom={setZoomed} attackingIds={attackerIds} onPreview={showPreview} onUnpreview={() => setHandHover(null)} /></div>
              </div>
            );
          })()}
          <LandsDivider landsBelow onMat />
          <Lane perms={cardsIn(actor, "land")} state={state} interaction={(p) => interaction(actor, p)} size="sm" onInspect={inspect} onZoom={setZoomed} attackingIds={attackerIds} onPreview={showPreview} onUnpreview={() => setHandHover(null)} />
        </Side>

        <Side label={`${playerName(actor)}'s hand`} tone="emerald">
          {/* While choosing cards (mulligan, discard) the hand stays together; otherwise playable cards come first, apart from the rest. */}
          {(() => {
            // While deciding whether to keep or mulligan the cards can only be looked at, until a mulligan means choosing cards to bottom.
            // Online, the player waiting for the other to keep or discard can only look too.
            const lookOnly = (state.phase === "mulligan" && mulligansTaken === 0) || (!mine && (state.phase === "mulligan" || state.phase === "cleanup"));
            const choosing = state.phase === "mulligan" || state.phase === "cleanup" || state.pendingPick !== null || state.winner !== null;
            const card = (c: (typeof showHand)[number]) => {
              const notes = handNotes(c.defId, playable.has(c.iid));
              return (
                <div
                  key={c.iid}
                  className="shrink-0"
                  onMouseEnter={(e) => showPreview(state.cards[c.defId], e.currentTarget)}
                  onMouseLeave={() => setHandHover(null)}
                >
                <CardView
                  iid={c.iid}
                  def={state.cards[c.defId]}
                  ring={handPick.includes(c.iid) ? "ring-2 ring-red-400" : choosing && !lookOnly && (state.phase === "mulligan" || state.phase === "cleanup") ? "ring-2 ring-emerald-400" : ""}
                  castable={notes.castable}
                  dim={notes.dim}
                  hint={notes.hint}
                  onClick={lookOnly ? undefined : () => clickHandCard(c.iid, c.defId)}
                  onHover={() => inspect(state.cards[c.defId])}
                  onZoom={() => setZoomed(state.cards[c.defId])}
                />
                </div>
              );
            };
            if (choosing) return <div className="flex min-h-[calc(var(--card-h,168px)*0.8)] items-start gap-1.5 overflow-x-auto py-1">{showHand.map(card)}</div>;
            const ready = showHand.filter((c) => playable.has(c.iid));
            const waiting = showHand.filter((c) => !playable.has(c.iid));
            // Playable cards and the rest sit side by side in one row, so the hand takes one card's height.
            return (
              <div className="flex items-stretch gap-2 overflow-x-auto py-1">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <h3 className="text-[10px] font-semibold uppercase font-display tracking-wide text-[#a7f3d0]">Can play now ({ready.length})</h3>
                  <div className="flex min-h-[calc(var(--card-h,168px)*0.8+0.5rem)] items-start gap-1.5 rounded-lg border border-[#6ee7b7]/40 bg-[#022c22]/40 p-1">
                    {ready.length > 0 ? ready.map(card) : <p className="self-center px-2 text-xs text-slate-300">Nothing can be played right now.</p>}
                  </div>
                </div>
                {waiting.length > 0 && (
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <h3 className="text-[10px] font-semibold uppercase font-display tracking-wide text-slate-300">Can&apos;t play now ({waiting.length})</h3>
                    <div className="flex items-start gap-1.5 rounded-lg border border-white/15 bg-white/10 p-1">{waiting.map(card)}</div>
                  </div>
                )}
              </div>
            );
          })()}
        </Side>
      </section>

      {/* Right: the card under the mouse, big */}
      <aside className="flex flex-col gap-2 lg:min-h-0">
        {/* Your opponent: top right */}
        <div className="shrink-0">
          <PlayersPanel state={state} order={[other]} actor={actor} onResign={online ? undefined : setResigning} heading="Opponent" />
        </div>
        <div className="min-h-0 flex-1 lg:overflow-y-auto">
          <CardDetail inspected={inspected} />
        </div>
      </aside>

      {abilitiesOpen && !state.pendingChoice && !targeting && (
        <div role="dialog" aria-modal="true" aria-label="Abilities" className="fixed inset-0 z-30 flex items-start justify-center bg-black/40 p-4 pt-24" onClick={() => setAbilitiesOpen(false)}>
          <div className="flex max-h-[80dvh] w-full max-w-3xl flex-col gap-3 overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold uppercase font-display tracking-wide text-emerald-800">⚡ Abilities</h2>
              <button onClick={() => setAbilitiesOpen(false)} aria-label="Close" className="rounded-full border border-zinc-300 px-3 leading-7 hover:bg-zinc-100">
                ✕
              </button>
            </div>
            <AbilityPanel
              state={state}
              abilities={abilityList.abilities}
              onUse={(a) => (setAbilitiesOpen(false), runAbility(a))}
              cycles={abilityList.cycles}
              onCycle={(iid) => (setAbilitiesOpen(false), act({ type: "cycle", iid }))}
              crews={abilityList.crews}
              onCrew={(iid) => (setAbilitiesOpen(false), act({ type: "crew", iid }))}
              loyalty={abilityList.loyalty}
              onLoyalty={(a) => (setAbilitiesOpen(false), runLoyalty(a))}
              locked={lockedAbilities()}
              warnings={abilityWarnings()}
              flashbacks={abilityList.flashbacks}
              exileLands={abilityList.exileLands}
              onPlayLand={(iid) => (setAbilitiesOpen(false), act({ type: "playLand", iid }))}
              onFlashback={(iid) => {
                const castable = getCastable(state, actor).find((c) => c.iid === iid && (c.zone === "graveyard" || c.zone === "exile"));
                const card = [...state.players[actor].graveyard, ...state.players[actor].exile].find((x) => x.iid === iid);
                setAbilitiesOpen(false);
                if (castable && card) advance({ iid, name: state.cards[card.defId].name, from: castable.zone, castable });
              }}
            />
          </div>
        </div>
      )}

      {viewingYard && <GraveyardDialog state={state} owner={viewingYard.owner} zone={viewingYard.zone} onClose={() => (setHandHover(null), setViewingYard(null))} onZoom={setZoomed} onPreview={showPreview} onUnpreview={() => setHandHover(null)} />}

      {handHover && !zoomed && !state.winner && (
        <div className="pointer-events-none fixed z-40 overflow-hidden rounded-2xl shadow-2xl ring-4 ring-white/80" style={{ left: handHover.left, top: handHover.top, width: HAND_ZOOM_W }}>
          <CardImage def={handHover.def} size="normal" className="block w-full" fallback={<div className="bg-slate-800 p-4 text-sm text-white">{handHover.def.name}</div>} />
        </div>
      )}

      {zoomed && <Lightbox def={zoomed} onClose={() => setZoomed(null)} />}

      {resigning && !state.winner && (
        <ResignDialog
          player={resigning}
          onCancel={() => setResigning(null)}
          onConfirm={() => {
            act({ type: "concede" }, resigning);
            setResigning(null);
          }}
        />
      )}

      {turnSplash > 0 && !state.winner && <TurnSplash key={turnSplash} />}
      {online && showEndTurn && !state.winner && !targeting && !plan && attacking.length === 0 && (
        <PassReminder state={state} after={state.phase === "main2" && onlyLandsLeft ? REMIND_DONE_MS : REMIND_IDLE_MS} opponent={playerName(other)} onEndTurn={endTurn} />
      )}

      {state.winner && <VictoryDialog
          winner={state.winner}
          reason={endNote ?? (online ? net.snapshot?.endReason ?? null : null)}
          onPlayAgain={startGame}
          you={online ? actor : undefined}
          onLeave={
            online
              ? () => {
                  leaveRoom();
                  router.push("/");
                }
              : undefined
          }
        />}
    </main>
  );
}

type Interaction = (p: Permanent) => { onClick?: () => void; ring: string; note?: string; combat?: { tone: string; label: string; why?: string }; dim?: boolean };

function Side({ label, children, player, tone, grow, mat, zones, overlay }: { label: string; children: React.ReactNode; player?: PlayerId; tone?: "emerald"; grow?: boolean; mat?: string; zones?: React.ReactNode; overlay?: React.ReactNode }) {
  const style = player ? PLAYER_STYLE[player] : null;
  if (mat) {
    // A playmat: the player's chosen surface, and the library and graveyard in their own zones on the right.
    return (
      <section
        className={`playmat relative flex flex-col gap-1 rounded-2xl border-2 border-black/60 px-3 py-1.5 text-white ${grow ? "min-h-0 flex-1 overflow-hidden" : "shrink-0"}`}
        style={{ background: `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.2)), ${mat}` }}
      >
        <h2 className="relative z-[1] flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
          {style && <span className={`inline-block h-3 w-3 rounded-full ring-2 ring-white/70 ${style.bar}`} aria-hidden="true" />}
          {label}
        </h2>
        {/* Notices (what the other player just cast) float over the mat, so they never squeeze the cards. */}
        {overlay && <div className="absolute inset-x-4 top-9 z-20 flex flex-col gap-1.5 lg:right-48">{overlay}</div>}
        <div className="relative z-[1] flex min-h-0 flex-1 gap-3">
          <FitToHeight className="flex-1">{children}</FitToHeight>
          {zones && <div className="flex w-44 shrink-0 flex-col gap-1.5 rounded-xl border-2 border-dashed border-white/30 bg-black/25 p-1.5">{zones}</div>}
        </div>
      </section>
    );
  }
  const tray = tone === "emerald";
  return (
    <section
      className={`relative flex flex-col gap-1.5 rounded-2xl border-2 px-3 py-2 shadow-lg ${grow ? "min-h-0 flex-1 overflow-y-auto" : "shrink-0"} ${
        tray ? "border-[#6ee7b7]/50 bg-slate-950/65 text-white" : style ? `${style.border} ${style.borderL} ${style.soft}` : "border-zinc-200 border-l-zinc-400 bg-white/70"
      }`}
    >
      <h2 className={`flex items-center gap-2 font-display text-xs font-bold uppercase tracking-widest ${tray ? "text-[#a7f3d0]" : "text-zinc-600"}`}>
        {style && <span className={`inline-block h-2.5 w-2.5 rounded-full ${style.bar}`} aria-hidden="true" />}
        {label}
      </h2>
      {children}
    </section>
  );
}

/** The line between a player's creatures and lands, labelled on the side where the lands are. */
function LandsDivider({ landsBelow, onMat }: { landsBelow: boolean; onMat?: boolean }) {
  const label = <span className={`font-display text-[10px] font-semibold uppercase tracking-widest ${onMat ? "text-white/70 [text-shadow:0_1px_2px_rgba(0,0,0,0.7)]" : "text-zinc-500"}`}>Lands &amp; artifacts</span>;
  return (
    <div className="flex flex-col gap-0.5" role="separator" aria-label="Lands are on this side of the line">
      {!landsBelow && label}
      <div className={`h-0.5 w-full rounded ${onMat ? "bg-gradient-to-r from-transparent via-[#fde68a]/70 to-transparent" : "bg-zinc-400"}`} />
      {landsBelow && label}
    </div>
  );
}

const statusOf = (p: Permanent) =>
  [p.tapped && "Tapped", p.summoningSick && "Summoning sick", p.damage > 0 && `${p.damage} damage`].filter(Boolean) as string[];

/** One row of permanents (lands or creatures). */
function Lane({
  perms,
  state,
  interaction,
  size,
  onInspect,
  onZoom,
  attackingIds,
  onPreview,
  onUnpreview,
  collapseEmpty,
}: {
  /** An empty row takes no space (used in combat, when room is tight). */
  collapseEmpty?: boolean;
  perms: Permanent[];
  onPreview: (def: CardDef, el: HTMLElement) => void;
  onUnpreview: () => void;
  attackingIds: string[];
  state: GameState;
  interaction: Interaction;
  size: "sm" | "md";
  onInspect: (def: Inspected["def"], status?: string[]) => void;
  onZoom: (def: Inspected["def"]) => void;
}) {
  const everything = [...state.players.p1.battlefield, ...state.players.p2.battlefield];
  const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

  const renderPerm = (p: Permanent, attachment = false) => {
    const def = state.cards[p.card.defId];
    // Auras and Equipment: "On: <creature>" on them, and their names on the creature they are attached to.
    const host = p.attachedTo ? everything.find((x) => x.card.iid === p.attachedTo) : undefined;
    const attached = everything.filter((x) => x.attachedTo === p.card.iid);
    const tags = [
      ...(host ? [`On: ${state.cards[host.card.defId].name}`] : []),
      ...attached.map((a) => `+ ${state.cards[a.card.defId].name}`),
      ...(p.counters ? [`${p.counters}× +1/+1`] : []),
      ...(p.minusCounters ? [`${p.minusCounters}× -1/-1`] : []),
      ...(p.chosenColor ? [`Color: ${p.chosenColor}`] : []),
      ...(p.regenShield ? ["Regenerates"] : []),
      // effects that last until end of turn
      ...(p.powerBonus || p.toughnessBonus ? [`${sign(p.powerBonus ?? 0)}/${sign(p.toughnessBonus ?? 0)} this turn`] : []),
      ...(p.tempKeywords ?? []).map((k) => `${k} this turn`),
      ...(p.cantBlockTurn ? ["can't block this turn"] : []),
      ...(p.controlReturn ? ["stolen until end of turn"] : []),
      // which spell or ability is behind those effects
      ...(p.tempFrom ?? []).map((f) => `✦ ${f.name}`),
      ...(p.loyalty !== undefined ? [`Loyalty ${p.loyalty}`] : []),
      ...(p.crewed ? ["Crewed"] : []),
    ];
    const creature = def.type === "creature" || p.crewed === true;
    return (
      <div key={p.card.iid} className="shrink-0" onMouseEnter={(e) => onPreview(def, e.currentTarget)} onMouseLeave={onUnpreview}>
      <CardView
        iid={p.card.iid}
        tags={tags}
        power={creature ? powerOf(state, p) : undefined}
        toughness={creature ? toughnessOf(state, p) : undefined}
        attacking={attackingIds.includes(p.card.iid)}
        def={def}
        size={attachment ? "sm" : size}
        tapped={p.tapped}
        summoningSick={p.summoningSick}
        damage={p.damage}
        {...interaction(p)}
        {...(attachment ? { ring: "ring-2 ring-violet-400" } : {})}
        onHover={() => onInspect(def, statusOf(p))}
        onZoom={() => onZoom(def)}
      />
      </div>
    );
  };

  return (
    <div className={`flex flex-wrap items-start gap-1.5 ${collapseEmpty && perms.length === 0 ? "" : size === "md" ? "min-h-[var(--card-h,168px)]" : "min-h-[calc(var(--card-h,168px)*0.8)]"}`}>
      {perms
        // An Aura or Equipment is drawn next to what it is attached to, not on its own.
        .filter((p) => !(p.attachedTo && everything.some((x) => x.card.iid === p.attachedTo)))
        .map((p) => {
          const attachments = everything.filter((x) => x.attachedTo === p.card.iid);
          const group = (
            <>
              {renderPerm(p)}
              {attachments.map((a) => renderPerm(a, true))}
            </>
          );
          return attachments.length > 0 ? (
            <div key={p.card.iid} className="flex items-start gap-1 rounded-lg border border-violet-300 bg-violet-50/50 p-1">
              {group}
            </div>
          ) : (
            <div key={p.card.iid}>{group}</div>
          );
        })}
    </div>
  );
}

/** Divide an attacker's damage among the creatures blocking it (rule 510.1c). The total always stays equal to its power. */
function DamagePanel({
  state,
  needed,
  effective,
  onShift,
}: {
  state: GameState;
  needed: ReturnType<typeof getDamageAssignments>;
  effective: (attacker: string) => Record<string, number>;
  onShift: (attacker: string, from: string, to: string) => void;
}) {
  const perm = (iid: string) => Object.values(state.players).flatMap((p) => p.battlefield).find((x) => x.card.iid === iid)!;
  const name = (iid: string) => state.cards[perm(iid).card.defId].name;

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-amber-500/40 bg-zinc-100 p-3">
      <h2 className="text-xs font-semibold uppercase font-display tracking-wide text-amber-600">Assign combat damage</h2>
      {needed.map(({ attacker, blockers, power, trampleTo }) => {
        const amounts = effective(attacker);
        // A trampler may also put damage on the defending player (after lethal damage on every blocker).
        const targets = trampleTo ? [...blockers, trampleTo] : blockers;
        return (
          <div key={attacker} className="flex flex-col gap-1">
            <div className="text-sm">
              <span className="font-semibold">{name(attacker)}</span> deals {power} damage, divided among its blockers
              {trampleTo ? ` and (trample) ${playerName(trampleTo)}` : ""}:
            </div>
            {targets.map((id) => {
              const others = targets.filter((o) => o !== id);
              const give = others.find((o) => (amounts[o] ?? 0) > 0); // "+" takes one from a target that has some
              const take = others[0]; // "-" gives one to another target
              const isPlayerRow = id === trampleTo;
              const b = isPlayerRow ? null : perm(id);
              const toughnessLeft = b ? (state.cards[b.card.defId].toughness ?? 0) - b.damage : null;
              const label = isPlayerRow ? `${playerName(trampleTo)} (trample)` : name(id);
              return (
                <div key={id} className="flex items-center gap-2 text-sm">
                  <span className="w-40 truncate">{label}</span>
                  {toughnessLeft !== null && <span className="text-xs text-zinc-500">toughness {toughnessLeft}</span>}
                  <button
                    disabled={!(amounts[id] > 0) || !take}
                    onClick={() => onShift(attacker, id, take)}
                    className="rounded bg-zinc-300 px-2 hover:bg-zinc-400 disabled:opacity-30"
                    aria-label={`Less damage to ${label}`}
                  >
                    -
                  </button>
                  <span className="w-5 text-center font-bold">{amounts[id] ?? 0}</span>
                  <button
                    disabled={!give}
                    onClick={() => give && onShift(attacker, give, id)}
                    className="rounded bg-zinc-300 px-2 hover:bg-zinc-400 disabled:opacity-30"
                    aria-label={`More damage to ${label}`}
                  >
                    +
                  </button>
                </div>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}
