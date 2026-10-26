"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { flushSync } from "react-dom";
import {
  applyAction,
  createGame,
  getCastable,
  getDamageAssignments,
  getLegalActions,
  getPossibleAttackers,
  getForcedBlocks,
  getPossibleBlockers,
  OPPONENT,
  parseCard,
  playerToAct,
  powerOf,
  suggestDamageAssignment,
  legalTargets,
} from "@mtg/engine";
import type { Action, Activatable, CardDef, GameEvent, GameState, Permanent, PlayerId, TargetChoice, TargetSpec } from "@mtg/engine";
import { useBattlefieldBackground } from "@/lib/background";
<<<<<<< HEAD
import { dismissNotice, leaveRoom, onGameUpdate, send as netSend, tryReconnect, useOnline } from "@/lib/online/session";
import { fetchCardsByIds } from "@/lib/cards";
import { buildRandomDeck } from "@/lib/randomDeck";
import { deckStatus, expandDeck, listMyDecks, loadDefsFor } from "@/lib/decks";
=======
import { leaveRoom, send as netSend, useOnline } from "@/lib/online/session";
>>>>>>> 437f1392709f8c4f2684b47c60b2558a0b8f792f
import CardDetail, { CardImage, Lightbox } from "./CardDetail";
import type { Inspected } from "./CardDetail";
import CoinFlip from "./CoinFlip";
<<<<<<< HEAD
import EnterBattlefield from "./EnterBattlefield";
import LookPicker from "./LookPicker";
import { isCombatPlaying, playCombat } from "./combatFx";
import { ResignDialog, VictoryDialog } from "./EndDialogs";
import { GraveyardDialog, Pile } from "./Piles";
import { hideDrawn, holdPiles, isPileBusy, playDeal, playDraws, playToGraveyard, untilBattlefieldShown } from "./pileFx";
import type { Draw } from "./pileFx";
import { announcementsFrom, describeEvents, endReason, playerName } from "./log";
import type { Announcement } from "./log";
import Announcements, { PassReminder, PlayedThisTurn, TurnSplash, WelcomeSplash } from "./Announcements";
=======
import { attackersIn, isCombatPlaying, playCombat } from "./combatFx";
import { ResignDialog, VictoryDialog } from "./EndDialogs";
import { GraveyardDialog, Pile } from "./Piles";
import { handDraws, hideDrawn, isPileBusy, playDeal, playDraws, playToGraveyard } from "./pileFx";
import type { Draw } from "./pileFx";
import { announcementsFrom, describeEvents, endReason, playerName } from "./log";
import type { Announcement } from "./log";
import { PassReminder, PlayedThisTurn, TurnSplash } from "./Announcements";
import ResolveZone, { holdReveal, isRevealing } from "./ResolveZone";
>>>>>>> 437f1392709f8c4f2684b47c60b2558a0b8f792f
import { ChatPanel, LogPanel, PlayersPanel } from "./SidePanels";
import BackgroundPicker from "./BackgroundPicker";
import AppearanceDialog from "./AppearanceDialog";
import { useAppearance } from "@/lib/playmat";
import { useCustomCursor } from "@/lib/cursor";
import BlockPanel from "./BlockPanel";
import { attackHint, blockHint, canBlock } from "./combatHints";
import { readable } from "./cardText";
import { ChoicePanel } from "./ChoicePanels";
import { PickPanel, ResolvingNotice } from "./PickPanel";
import { StackPanel } from "./StackPanel";
import { TargetPanel } from "./TargetPanel";
import type { ChatMessage } from "./SidePanels";
import AbilitiesDialog from "./AbilitiesDialog";
import { abilityList, countAbilities, lockedAbilities } from "./abilityInfo";
import { Battlefield, Side } from "./Board";
import type { LaneContext } from "./Board";
import CastPlanPanels from "./CastPlanPanels";
import { cardNameAnywhere, paymentOf, preparedSpell } from "./castInfo";
import type { CastPlan } from "./castInfo";
import { AttackTargetsPanel, DamagePanel } from "./CombatPanels";
import CommandBar, { primaryAction } from "./CommandBar";
import HandRow from "./HandRow";
import HotSeatSetup, { useHotSeatDecks } from "./HotSeatSetup";
import type { DeckPair } from "./HotSeatSetup";
import { KeepRandomDecks } from "./SaveDeck";
import type { PlayedDeck } from "./SaveDeck";
import StepBanner from "./StepBanner";
import { playGameSounds } from "./gameSounds";
import { useOnlineMatch } from "./useOnlineMatch";

const newSeed = () => Date.now() % 2_147_483_647;

/** Width of the big card shown while the mouse is over a card in hand. */
const HAND_ZOOM_W = 320;
/** How long "Your turn" stays on screen; matches the turn-splash animation in globals.css. */
const TURN_SPLASH_MS = 1800;
const WELCOME_MS = 2300; // how long "Welcome to the Battle Field, Now Duel!" stays up before the cards are dealt
// How long a player can sit on their own turn before being reminded to pass it; shorter once nothing is left to do.
const REMIND_IDLE_MS = 20000;
const REMIND_DONE_MS = 6000;

/**
 * The online play screen, one per match. Next.js keeps a page alive after leaving it (cacheComponents),
 * so without the key a new match would open on the last match's board and end popup.
 */
export function OnlineGame() {
  const { matchId, game } = useOnline();
  return (
    <>
      <Game key={`game-${matchId ?? "none"}`} online />
      {/* the loading screen: up until the match has arrived from the server, then it fades */}
      <EnterBattlefield key={`enter-${matchId ?? "none"}`} ready={game !== null} names={game?.names} />
    </>
  );
}

/**
 * The play screen. On its own (hot-seat) it runs the game itself, with both players on one screen.
 * With `online` the game runs on the game server: this screen shows the game as the server describes it to this player,
 * sends this player's actions, and does nothing while it is the other player's turn.
 */
export default function Game({ online = false }: { online?: boolean } = {}) {
  const [localGame, setGame] = useState<GameState | null>(null);
  const [entered, setEntered] = useState(0); // hot-seat: how many times a match has begun, for the loading screen
  const net = useOnline();
  /** The game on screen: hot-seat, the one this screen has been updating, or (right after joining) the server's first view. */
  const game = localGame ?? (online ? (net.game?.view ?? null) : null);
  const router = useRouter();
  // Which player this browser is. Remembered, because leaving the room at the end clears `net.game`:
  // falling back to the player to act would flip the screen (and the end popup) to the opponent's side.
  const [seat, setSeat] = useState<PlayerId | null>(null);
  if (online && net.game && net.game.you !== seat) setSeat(net.game.you);
  // Watching a match (not playing it): the board is drawn from one side, both hands are face down, and nothing can be done.
  const [watching, setWatching] = useState(false);
  if (online && net.game && (net.game.spectator === true) !== watching) setWatching(net.game.spectator === true);
  // Online: after getting back in (a lost connection, a server restart) the server's copy of the game replaces the one on screen.
  const [startSeen, setStartSeen] = useState(net.game);
  if (online && net.game !== startSeen) {
    setStartSeen(net.game);
    if (net.game && localGame) setGame(net.game.view);
  }
  const gameRef = useRef<GameState | null>(null);
  const commitRef = useRef<(r: { state: GameState; events: GameEvent[] }) => Promise<void>>(async () => {});
  const endTurnRef = useRef<() => Promise<void>>(async () => {});
  const [endingTurn, setEndingTurn] = useState<number | null>(null); // the turn "End turn" was pressed in
  const background = useBattlefieldBackground(); // the picture behind the battlefield
  const look = useAppearance(online ? (net.game?.looks ?? null) : null); // each player's card sleeves and playmat (online: what each chose before the match)
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
  const [confirmSkip, setConfirmSkip] = useState(false); // "Skip attack" and "No blocks" ask once more while a creature could attack or block
  const [plan, setPlan] = useState<CastPlan | null>(null); // a spell being cast step by step
  const [modePick, setModePick] = useState<number[]>([]);
  const [history, setHistory] = useState<Announcement[]>([]); // everything cast or used, kept for the turn
  const [announcements, setAnnouncements] = useState<Announcement[]>([]); // "Player 1 cast ...", shown on the caster's side
  const [revealing, setRevealing] = useState<{ items: Announcement[]; cards: Record<string, CardDef> } | null>(null); // online: the opponent's play, shown before the board changes
  const [lifeConfirm, setLifeConfirm] = useState<{ text: string; options: { label: string; go: () => void }[] } | null>(null); // "this costs life / taps a creature: do it?"
  const [xValue, setXValue] = useState(0);
  const [attackTargets, setAttackTargets] = useState<Record<string, string>>({}); // attacker iid -> planeswalker iid
  const [handHover, setHandHover] = useState<{ def: CardDef; left: number; top: number } | null>(null); // the big card shown while the mouse is over a card
  const [abilitiesOpen, setAbilitiesOpen] = useState(false); // the abilities pop-up
  const [viewingYard, setViewingYard] = useState<{ owner: PlayerId; zone: "graveyard" | "exile" } | null>(null); // whose graveyard or exile is open
  const [endNote, setEndNote] = useState<string | null>(null); // how the game ended, for the win popup
  const [welcome, setWelcome] = useState(false); // "Welcome to the Battle Field, Now Duel!" while it is on screen
  const [turnSplash, setTurnSplash] = useState(0); // online: counts "Your turn" splashes, 0 while none is on screen

  const [loading, setLoading] = useState(false);
  // Decks and cards are loaded, and the players are flipping the coin before the game is created.
  const [pending, setPending] = useState<DeckPair | null>(null);
  const [localDeckNames, setDeckNames] = useState<Record<PlayerId, string>>({ p1: "", p2: "" });
  const deckNames = online && net.game ? net.game.deckNames : localDeckNames; // shown on each library
  const [localDecks, setLocalDecks] = useState<Partial<Record<PlayerId, PlayedDeck>>>({});
  const [savedDecks, setSavedDecks] = useState<Partial<Record<PlayerId, string>>>({}); // random decks kept in My decks: the copy's id
  const hotSeat = useHotSeatDecks(!online);

  useEffect(() => {
    gameRef.current = game;
    commitRef.current = commit;
    endTurnRef.current = endTurn;
  });

  // Hot-seat: "End turn" stopped for a choice along the way (a trigger's target) carries on once it's settled. Online the server does this.
  useEffect(() => {
    if (online || !game || endingTurn !== game.turn || game.winner || game.phase === "cleanup") return;
    if (game.priority || game.pendingChoice || game.pendingPick) return;
    void endTurnRef.current();
  }, [online, game, endingTurn]);

<<<<<<< HEAD
  // Online: the opening hand is hidden before it is ever painted, then flies in from the library.
  useLayoutEffect(() => {
    if (!online || !game || !net.game || dealt.current) return;
    dealt.current = true;
    if (!net.game.fresh) return;
    void openingDeal(handDraws(game), net.game.spectator !== true); // a spectator is not greeted
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
=======
  useOnlineMatch(online, game, seat, gameRef, commitRef);
>>>>>>> 437f1392709f8c4f2684b47c60b2558a0b8f792f

  async function startGame() {
    setLoading(true);
    setError(null);
    try {
      const decks = await hotSeat.load();
      setGame(null);
      setPending(decks);
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
        <button
          onClick={() => {
            leaveRoom();
            router.push("/");
          }}
          className="btn-ghost"
        >
          ← Back to dashboard
        </button>
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
            setEntered((n) => n + 1);
            setDeckNames(pending.names);
            setLocalDecks({ p1: { name: pending.names.p1, ids: pending.decks.p1 }, p2: { name: pending.names.p2, ids: pending.decks.p2 } });
            setSavedDecks({});
            setHistory([]);
            setAnnouncements([]);
          });
          // The opening seven are dealt from the library into the hand.
<<<<<<< HEAD
          void openingDeal(handDraws(fresh), true);
=======
          const dealt = handDraws(fresh, seat);
          hideDrawn(dealt);
          void playDeal(dealt);
>>>>>>> 437f1392709f8c4f2684b47c60b2558a0b8f792f
        }}
      />
    );
  }

<<<<<<< HEAD
  if (!game) {
    return (
      <main className="relative flex flex-1 flex-col items-center justify-center gap-5 p-5 text-slate-100 sm:p-8">
        <div className="page-atmosphere" aria-hidden="true" />
        <div className="panel-glass flex w-full max-w-3xl flex-col items-center gap-5 p-6 sm:p-8">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="page-title !text-3xl sm:!text-4xl">Hot-seat duel</h1>
            <p className="text-slate-300">Two players, one screen. Heads or tails decides who goes first.</p>
          </div>

          <div className="flex w-full flex-wrap justify-center gap-4">
            {(["p1", "p2"] as const).map((p) => (
              <div key={p} className="seat-card" style={{ "--accent": p === "p1" ? "#f4b43d" : "#38bdf8" } as React.CSSProperties}>
                <span className="seat-name">
                  <i aria-hidden="true" />
                  {playerName(p)}
                </span>
                <span className="field-label">Vote for the deck size</span>
                <div className="seg seg-wide" role="group" aria-label={`${playerName(p)}: deck size`}>
                  {DECK_SIZES.map((n) => (
                    <button
                      key={n}
                      aria-pressed={votes[p] === n}
                      onClick={() => {
                        setVotes((v) => ({ ...v, [p]: n }));
                        setChoice({ p1: RANDOM_ID, p2: RANDOM_ID }); // decks depend on the size
                      }}
                    >
                      {n} cards
                    </button>
                  ))}
                </div>
                {agreedSize && (
                  <label className="flex flex-col gap-1.5">
                    <span className="field-label">Deck</span>
                    <span className="tool-field !py-2">
                      <select value={choice[p]} onChange={(e) => setChoice((c) => ({ ...c, [p]: e.target.value }))} className="glass-select w-full cursor-pointer">
                        {deckChoices.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                        <option value={RANDOM_ID}>Random {agreedSize}-card deck</option>
                      </select>
                    </span>
                  </label>
                )}
                <LookPicker who={p} sleeve={look.storedSleeve[p]} mat={look.storedMat[p]} onSleeve={(v) => look.choose("sleeve", p, v)} onMat={(v) => look.choose("mat", p, v)} />
              </div>
            ))}
          </div>

          <p className={`max-w-md text-center text-sm ${!agreedSize && votes.p1 !== null && votes.p2 !== null ? "text-[#fde68a]" : "text-slate-300"}`}>
            {agreedSize
              ? `Agreed: ${agreedSize}-card decks. A player without a saved deck of that size gets a random one.`
              : votes.p1 !== null && votes.p2 !== null
                ? "You voted for different sizes. Both players must agree on the same deck size."
                : "Each player votes. The game starts when both choose the same size."}
          </p>
          {hidden > 0 && (
            <p className="max-w-md text-center text-xs text-slate-400">
              {hidden} saved deck{hidden > 1 ? "s are" : " is"} not offered: not legal (20+ cards, max 4 copies) or containing cards the game can&apos;t play yet. Only decks with exactly
              the voted size are listed. See the Decks page.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button onClick={startGame} disabled={loading || !agreedSize} className="btn-gold !px-8 !py-3 !text-base">
              {loading ? "Loading cards…" : "Start game"}
            </button>
            <Link href="/" className="btn-ghost !px-5 !py-3 !text-sm">
              ← Back to home
            </Link>
          </div>
          {error && <p role="alert" className="max-w-md rounded-xl border border-red-400/40 bg-red-950/50 px-3 py-2 text-center text-sm text-[#fecaca]">{error}</p>}
        </div>
      </main>
    );
  }
=======
  if (!game) return <HotSeatSetup decks={hotSeat} loading={loading} error={error} onStart={startGame} />;
>>>>>>> 437f1392709f8c4f2684b47c60b2558a0b8f792f

  const state = game;
  const actor = seat ?? playerToAct(state);
  /** Hot-seat: always true. Online: only while the game is waiting for this player. */
  const mine = !online || (!watching && playerToAct(state) === actor);
  const other = OPPONENT[actor];
  // Online the server only tells each player their own deck.
  const playedDecks: Partial<Record<PlayerId, PlayedDeck>> = online ? (net.game?.deck ? { [actor]: net.game.deck } : {}) : localDecks;
  const keepDeck = (who: PlayerId, id: string) => setSavedDecks((s) => ({ ...s, [who]: id }));
  const legal = getLegalActions(state, actor);
  const playable = new Set(legal.flatMap((a) => (a.type === "playLand" || a.type === "castCreature" || a.type === "castSpell" ? [a.iid] : [])));
  const possibleAttackers = getPossibleAttackers(state);
  const possibleBlockers = getPossibleBlockers(state);
  // Blocks the rules force ("all creatures able to block it do so") are part of the blocks from the start.
  const blocks = { ...chosenBlocks, ...Object.fromEntries(getForcedBlocks(state).map((f) => [f.blocker, f.attacker])) };
  const attackerIds = state.combat?.attackers.map((a) => a.attacker) ?? [];

  /**
   * Applies an action for `as` (the player to act, unless someone resigns out of turn). Before it is applied the player is asked about
   * anything they might not want: life paid for Phyrexian mana, and creatures tapped for mana (which could attack or block instead).
   */
  async function act(action: Action, as: PlayerId = actor, opts: { life?: boolean; mana?: boolean; pointless?: boolean; spare?: string[] } = {}) {
<<<<<<< HEAD
    if (watching || isCombatPlaying() || isPileBusy()) return; // a watcher can't act; and ignore clicks while something is being animated
=======
    if (isCombatPlaying() || isPileBusy() || isRevealing()) return; // ignore clicks while something is being animated
>>>>>>> 437f1392709f8c4f2684b47c60b2558a0b8f792f
    const spare = opts.spare ?? [];
    const pay = paymentOf(state, action, as, spare);
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
      if (card && spell && !spell.modal && spell.effects.length > 0 && spell.effects.every((e) => "what" in e && e.what?.t === "attackingCreatures")) {
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
    const fought = attackersIn(state, r.events);
    if (fought.length > 0) await playCombat(r.events, fought);
    await commit(r);
    setError(null);
  }

  /**
   * Shows the result of an action: cards that died fly to the graveyard first, then the new state appears and
   * the cards that were drawn fly out of the library, turn over in the middle and land in the hand.
   */
  async function commit(r: { state: GameState; events: GameEvent[] }) {
    const viewer = seat ?? playerToAct(r.state);
    playGameSounds(r.events, online ? viewer : null);
    const told = announcementsFrom(r.events, r.state);
    // Online: what the opponent cast or used is shown in the "to resolve" zone first, then it resolves.
    const theirs = online ? told.filter((a) => a.player !== viewer) : [];
    if (theirs.length > 0) {
      flushSync(() => setRevealing({ items: theirs, cards: r.state.cards }));
      await holdReveal();
    }
    const gone = r.events.flatMap((e) => (e.type === "creatureDied" ? [e.iid] : e.type === "cardsDiscarded" ? e.iids : []));
    await playToGraveyard(gone);
    // Only the viewer's own cards are animated: the opponent's hand is just a count, so their draw or mulligan
    // would fly across this screen as if it were the viewer's.
    const draws: Draw[] = gameRef.current?.phase === "mulligan" ? [] : r.events.flatMap((e) => {
      const card = e.type === "cardDrawn" && e.player === viewer ? r.state.players[viewer].hand.find((c) => c.iid === e.iid) : undefined;
      return card ? [{ iid: card.iid, owner: viewer, faceUp: true, def: r.state.cards[card.defId] }] : [];
    }).slice(0, 3);
    // A mulligan deals a whole new hand.
    const redeal = r.events.some((e) => e.type === "mulliganTaken" && e.player === viewer);
    const dealt: Draw[] = redeal ? handDraws(r.state, seat) : [];
    // flushSync puts the new cards on the page right away, so they can be hidden before they are ever painted.
    flushSync(() => {
      setGame(r.state);
      setHandHover(null);
      setLog((l) => [...describeEvents(r.events, r.state).reverse(), ...l].slice(0, 60));
      setEndNote(endReason(r.events, r.state));
      // Online: the opponent passed the turn. Said loudly, in case this player looked away while waiting.
      if (online && r.events.some((e) => e.type === "turnStarted" && e.player === viewer)) setTurnSplash((n) => n + 1);
      setRevealing(null);
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

<<<<<<< HEAD
  /**
   * The start of a match: the opening hand stays hidden while the loading screen fades and, for the players, "Welcome to the
   * Battle Field, Now Duel!" shows on the board. Then the cards are dealt from the library.
   */
  async function openingDeal(hand: Draw[], greet: boolean) {
    hideDrawn(hand);
    const release = holdPiles(); // clicks wait for the cards
    try {
      await untilBattlefieldShown();
      if (greet) {
        setWelcome(true);
        await new Promise((r) => setTimeout(r, WELCOME_MS));
        setWelcome(false);
      }
    } finally {
      release();
    }
    await playDeal(hand);
  }

  /** The hand of the player looking at the screen, as cards to animate. */
  function handDraws(s: GameState): Draw[] {
    const viewer = seat ?? playerToAct(s);
    return s.players[viewer].hand.map((c) => ({ iid: c.iid, owner: viewer, faceUp: true, def: s.cards[c.defId] }));
  }

=======
>>>>>>> 437f1392709f8c4f2684b47c60b2558a0b8f792f
  /**
   * Passes through the rest of the turn in one click (used when there is nothing to attack with).
   * Stops early if the player has to make a choice, such as discarding down to seven cards.
   */
  async function endTurn() {
    if (isCombatPlaying() || isPileBusy() || isRevealing()) return;
    setEndingTurn(state.turn);
    if (online) {
      if (mine) netSend("endTurn");
      return;
    }
    let s = state;
    const events: GameEvent[] = [];
    for (let i = 0; i < 6 && s.turn === state.turn && !s.winner && s.phase !== "cleanup"; i++) {
      const r = applyAction(s, playerToAct(s), { type: "passPhase" });
      if (!r.ok) {
        if (i === 0) setError(r.error); // later on, a trigger along the way needs a choice first: the turn carries on after it
        break;
      }
      s = r.state;
      events.push(...r.events);
    }
    await commit({ state: s, events });
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

  /** Moves a spell on to whatever it still needs: modes, the kicker, X, targets, and finally the cast itself. */
  function advance(p: CastPlan) {
    const c = p.castable;
    setPlan(p);
    if (c.modal && p.modes === undefined) return; // the mode panel is shown
    if (c.warp !== undefined && p.warp === undefined) return; // the warp panel is shown
    if ((c.kicker !== undefined || c.blight) && p.kicked === undefined) return; // the kicker (offspring, blight) panel is shown
    if (c.blight && p.kicked && p.sacrifice === undefined) return; // the creature to blight
    if (c.maxX !== undefined && p.x === undefined) {
      setXValue(c.maxX);
      return;
    }
    if ((c.sacrifice || c.discard) && p.sacrifice === undefined) return; // the sacrifice (or discard) panel is shown
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
      ...(p.warp ? { warp: true } : {}),
    });
    const title = p.name + (p.x !== undefined && c.maxX !== undefined ? ` (X = ${p.x})` : "") + (p.kicked ? (c.blight ? " (blighted)" : c.kickerName === "offspring" ? " (with offspring)" : " (kicked)") : "") + (p.warp ? " (warp)" : "");
    setPlan(null);
    if (specs.length === 0) {
      act(build([]));
    } else {
      setChosen([]);
      // what the spell does, from the card itself, shown while choosing
      const spellCard = Object.values(state.players).flatMap((pl) => [...pl.hand, ...pl.graveyard, ...pl.exile]).find((card) => card.iid === p.iid);
      const spellText = p.from === "prepared" ? preparedSpell(state, actor, p.iid)?.spell.text : spellCard ? state.cards[spellCard.defId].text : undefined;
      setTargeting({ title, specs, build, detail: spellText ? readable(spellText, p.name) : undefined });
    }
  }

  function startLoyalty(a: { iid: string; index: number; specs: TargetSpec[]; text: string }) {
    if (a.specs.length === 0) {
      act({ type: "loyalty", iid: a.iid, index: a.index, targets: [] });
    } else {
      setChosen([]);
      setTargeting({ title: readable(a.text.replace(/^[+-]?\d+: /, ""), state.cards[Object.values(state.players).flatMap((p) => p.battlefield).find((x) => x.card.iid === a.iid)!.card.defId].name), specs: a.specs, build: (targets) => ({ type: "loyalty", iid: a.iid, index: a.index, targets }) });
    }
  }

  function startAbility(a: Activatable, payWith?: string) {
    // "Discard a card" / "Sacrifice a creature" as a cost: ask which one first.
    if (a.costChoices && payWith === undefined) {
      setLifeConfirm({
        text: `${cardNameAnywhere(state, a.iid)}: choose ${a.costLabel ?? "a card"}`,
        options: a.costChoices.map((iid) => ({ label: cardNameAnywhere(state, iid), go: () => startAbility(a, iid) })),
      });
      return;
    }
    setLifeConfirm(null);
    const extra = payWith === undefined ? {} : { payWith };
    if (a.specs.length === 0) {
      act({ type: "activateAbility", iid: a.iid, index: a.index, targets: [], ...extra });
    } else {
      setChosen([]);
      setTargeting({ title: readable(a.text, cardNameAnywhere(state, a.iid)), specs: a.specs, build: (targets) => ({ type: "activateAbility", iid: a.iid, index: a.index, targets, ...extra }) });
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
            } else if (attackerIds.length === 1 && canBlock(state, actor, iid, attackerIds[0]).ok) {
              setBlocks((b) => ({ ...b, [iid]: attackerIds[0] })); // only one attacker: the click blocks it
              setPicked(null);
            } else {
              setPicked(picked === iid ? null : iid);
            }
          },
        };
      }
      if (owner === actor && isCreature) return { ring: "", dim: true }; // can't block
      if (owner !== actor && attackerIds.includes(iid)) {
        const blockedBy = Object.values(blocks).filter((a) => a === iid).length;
        const legal = picked ? canBlock(state, actor, picked, iid) : null;
        if (legal && !legal.ok) return { ring: "", dim: true, combat: { tone: "threat", label: "Can't block this", why: legal.reason } };
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
  const damageNeeded = state.phase === "damage" ? getDamageAssignments(state) : [];
  const effectiveAssign = (attacker: string) => assign[attacker] ?? suggestDamageAssignment(state, attacker);
  const primary = primaryAction(state, actor, mine, { handPick, attacking, attackTargets, blocks, damageTo: effectiveAssign });
  // The big button would give up an attack or blocks that could be made.
  const skipping =
    state.phase === "blockers" ? Object.keys(blocks).length === 0 && possibleBlockers.length > 0 : state.phase === "attackers" && attacking.length === 0 && possibleAttackers.length > 0;

  // In the first main phase, "Go to combat" is only available once the player has a card on their battlefield.
  const noCombatYet = state.phase === "main1" && state.players[actor].battlefield.length === 0;
  // When the only thing left to play is a land (or nothing at all), the button says "Pass turn".
  const onlyLandsLeft =
    (state.phase === "main1" || state.phase === "main2") &&
    [...playable].every((iid) => state.cards[state.players[actor].hand.find((c) => c.iid === iid)?.defId ?? ""]?.type === "land");
  // "End turn" skips the rest of the player's own turn at any point before combat or after it.
  const showEndTurn = mine && !state.priority && !state.pendingChoice && !state.pendingPick && (state.phase === "main1" || state.phase === "attackers" || state.phase === "main2");

  /** Shows the card big next to the element the mouse is over: above it when there is room, otherwise below. */
  function showPreview(def: CardDef, el: HTMLElement) {
    const r = el.getBoundingClientRect();
    const h = HAND_ZOOM_W * 1.4;
    const top = r.top - 8 - h >= 8 ? r.top - 8 - h : Math.min(r.bottom + 8, window.innerHeight - h - 8);
    setHandHover({ def, left: Math.min(Math.max(8, r.left + r.width / 2 - HAND_ZOOM_W / 2), window.innerWidth - HAND_ZOOM_W - 8), top: Math.max(8, top) });
  }
  const abilities = abilityList(state, actor);
  const abilityCount = countAbilities(abilities);
  const abilityLocked = lockedAbilities(state, actor).length;
  const inspect = (def: Inspected["def"], status?: string[]) => setInspected({ def, status });
  const lane: LaneContext = { state, attackingIds: attackerIds, onInspect: inspect, onZoom: setZoomed, onPreview: showPreview, onUnpreview: () => setHandHover(null) };
  // Choosing attackers or blockers: the player's combat zone shows even while it is empty.
  const combatSetup = (id: PlayerId) => mine && (state.phase === "attackers" || state.phase === "blockers") && id === actor;

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
        {!watching && (
          <ChatPanel
            messages={chat}
            as={actor}
            onSend={(text) => (online ? netSend("chat", { text }) : setChat((c) => [...c, { id: c.length, from: actor, text }]))}
          />
        )}
        <LogPanel lines={log} />
        {/* You: bottom left */}
        <div className="shrink-0">
<<<<<<< HEAD
          <PlayersPanel state={state} order={[actor]} actor={actor} onResign={watching ? undefined : setResigning} heading={watching ? "Player" : "You"} />
=======
          <PlayersPanel state={state} order={[actor]} actor={actor} onResign={setResigning} heading="You" />
          <KeepRandomDecks className="mt-2" decks={{ [actor]: playedDecks[actor] }} saved={savedDecks} onSaved={keepDeck} label={() => "Save my random deck"} />
>>>>>>> 437f1392709f8c4f2684b47c60b2558a0b8f792f
        </div>
      </aside>

      {lookOpen && <AppearanceDialog look={look} cursor={{ on: cursorOn, set: setCursorOn }} onClose={() => setLookOpen(false)} first={actor} />}

      {/* Center: the battle */}
      <section className="flex flex-col gap-1.5 lg:min-h-0">
        <Battlefield
          owner={other}
          top
          label={`${playerName(other)}'s battlefield`}
          mat={look.mat(other).css}
          lane={lane}
          interaction={(p) => interaction(other, p)}
          inCombat={(p) => inCombat(other, p)}
          combatSetup={combatSetup(other)}
          overlay={
            <ResolveZone
              state={state}
              played={announcements.filter((a) => a.player === other)}
              revealing={revealing}
              onClose={(id) => setAnnouncements((l) => l.filter((x) => x.id !== id))}
              onZoom={setZoomed}
            />
          }
          zones={
            <>
              <Pile state={state} owner={other} kind="library" compact deckName={deckNames[other]} sleeve={look.sleeve(other)} />
              <Pile state={state} owner={other} kind="graveyard" compact onOpen={() => setViewingYard({ owner: other, zone: "graveyard" })} />
              <Pile state={state} owner={other} kind="exile" onOpen={() => setViewingYard({ owner: other, zone: "exile" })} />
            </>
          }
        />

<<<<<<< HEAD
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
              const blocking = state.phase === "blockers";
              const skipping = blocking ? Object.keys(blocks).length === 0 && possibleBlockers.length > 0 : state.phase === "attackers" && attacking.length === 0 && possibleAttackers.length > 0;
              const incoming = (state.combat?.attackers ?? []).reduce((n, a) => {
                const perm = a.target ? undefined : state.players[other].battlefield.find((x) => x.card.iid === a.attacker);
                return n + (perm ? Math.max(0, powerOf(state, perm)) : 0);
              }, 0);
              if (skipping && confirmSkip)
                return (
                  <span role="group" aria-label={blocking ? "No blocks?" : "Skip attack?"} className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-amber-400 bg-amber-50 px-2 py-1 text-sm font-semibold text-amber-900">
                    {blocking ? `No blocks? You'll take ${incoming} damage.` : "Skip attack? Your creatures won't attack this turn."}
                    <button onClick={() => act(primary.action)} className="rounded-lg bg-gradient-to-b from-amber-300 to-amber-500 px-3 py-1 font-extrabold text-black">
                      {blocking ? "Yes, no blocks" : "Yes, skip"}
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
        {!state.winner && watching && (
          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-sky-300/50 bg-sky-950/60 px-3 py-2 text-sm text-sky-100 shadow-sm">
            <span aria-hidden="true">👁</span>
            <span className="min-w-0 flex-1">
              You are watching. It is <b>{playerName(playerToAct(state))}</b>&apos;s turn to act.
            </span>
          </div>
        )}
        {!state.winner && !watching && (() => {
          const mode: BannerMode = state.pendingPick || state.pendingChoice ? "choice" : state.priority ? "stack" : state.phase === "attackers" ? "attack" : state.phase === "blockers" ? "block" : state.phase === "damage" ? "damage" : state.phase === "mulligan" ? "mulligan" : state.phase === "cleanup" ? "cleanup" : "main";
          const b = BANNER[mode];
          return (
            <div className={`flex shrink-0 items-center gap-2.5 rounded-xl border px-3.5 py-2 shadow-sm ${b.box}`}>
              <span className="text-2xl" aria-hidden="true">
                {b.icon}
              </span>
              <div className="min-w-0 flex-1 text-[15px] leading-snug">
                <span className="mr-2.5 text-xs font-extrabold uppercase font-display tracking-widest">{b.label}</span>
                <span className="font-semibold">{hint}</span>
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
=======
        <CommandBar
          state={state}
          actor={actor}
          mine={mine}
          primary={primary}
          skipping={skipping}
          confirmSkip={confirmSkip}
          onConfirmSkip={setConfirmSkip}
          onAct={act}
          noCombatYet={noCombatYet}
          showEndTurn={showEndTurn}
          onlyLandsLeft={onlyLandsLeft}
          onEndTurn={endTurn}
        />
        <StepBanner state={state} actor={actor} waiting={online && !mine} error={error} abilityCount={abilityCount} abilityLocked={abilityLocked} onOpenAbilities={() => setAbilitiesOpen(true)} />
>>>>>>> 437f1392709f8c4f2684b47c60b2558a0b8f792f

        {/* Panels that appear while something needs an answer. They share a box that scrolls on its own, so the board never moves. */}
        <div className="action-box flex max-h-[34dvh] shrink-0 flex-col gap-1.5 overflow-y-auto empty:hidden">
        {mine && state.phase === "blockers" && !state.priority && !state.pendingChoice && !state.pendingPick && <BlockPanel state={state} actor={actor} blocks={blocks} picked={picked} onChange={(b) => { setBlocks(b); setPicked(null); }} onPicked={setPicked} />}

        <AttackTargetsPanel state={state} actor={actor} attacking={attacking} targets={attackTargets} onChange={setAttackTargets} />

        <StackPanel state={state} actor={actor} onPass={() => act({ type: "passPriority" })} waiting={online && !mine ? `Waiting for ${playerName(playerToAct(state))} to ${state.pendingPick || state.pendingChoice ? "choose" : "respond"}…` : undefined} />

        {lifeConfirm && (
          <ChoicePanel
            title={lifeConfirm.text}
            options={[...lifeConfirm.options.map((o) => ({ label: o.label, onPick: o.go })), { label: "Cancel", onPick: () => setLifeConfirm(null) }]}
            onCancel={() => setLifeConfirm(null)}
          />
        )}
        {plan && (
          <CastPlanPanels
            state={state}
            actor={actor}
            plan={plan}
            modePick={modePick}
            onModePick={setModePick}
            xValue={xValue}
            onX={setXValue}
            onAdvance={advance}
            onCancel={resetSelection}
          />
        )}

        {online && !mine && <ResolvingNotice state={state} onZoom={setZoomed} />}

        {mine && state.pendingChoice && endingTurn === state.turn && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            ⏭ Ending your turn: {state.pendingChoice.item.sourceName} still triggers along the way, even without an attack (that&apos;s the rule). Choose its target and your turn then ends by itself.
          </p>
        )}
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

        <Battlefield
          owner={actor}
          label={`${playerName(actor)}'s battlefield`}
          mat={look.mat(actor).css}
          lane={lane}
          interaction={(p) => interaction(actor, p)}
          inCombat={(p) => inCombat(actor, p)}
          combatSetup={combatSetup(actor)}
          zones={
            <>
              <Pile state={state} owner={actor} kind="exile" onOpen={() => setViewingYard({ owner: actor, zone: "exile" })} />
              <Pile state={state} owner={actor} kind="graveyard" compact onOpen={() => setViewingYard({ owner: actor, zone: "graveyard" })} />
              <Pile state={state} owner={actor} kind="library" compact deckName={deckNames[actor]} sleeve={look.sleeve(actor)} />
            </>
          }
        />

        {!watching && (
        <Side label={`${playerName(actor)}'s hand`} tone="emerald">
          <HandRow
            state={state}
            actor={actor}
            mine={mine}
            playable={playable}
            handPick={handPick}
            onClick={clickHandCard}
            onPreview={showPreview}
            onUnpreview={() => setHandHover(null)}
            onInspect={(def) => inspect(def)}
            onZoom={setZoomed}
          />
        </Side>
        )}
      </section>

      {/* Right: the card under the mouse, big */}
      <aside className="flex flex-col gap-2 lg:min-h-0">
        {/* Your opponent: top right */}
        <div className="shrink-0">
          <PlayersPanel state={state} order={[other]} actor={actor} onResign={online ? undefined : setResigning} heading={watching ? "Player" : "Opponent"} />
        </div>
        <div className="min-h-0 flex-1 lg:overflow-y-auto">
          <CardDetail inspected={inspected} />
        </div>
      </aside>

      {abilitiesOpen && !state.pendingChoice && !targeting && (
        <AbilitiesDialog
          state={state}
          actor={actor}
          list={abilities}
          onClose={() => setAbilitiesOpen(false)}
          onAct={act}
          onAbility={startAbility}
          onLoyalty={startLoyalty}
          onCast={advance}
        />
      )}

      {mine && <PickPanel state={state} onPick={(iid) => act({ type: "pick", iid })} onZoom={setZoomed} onPreview={showPreview} onUnpreview={() => setHandHover(null)} />}
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

      {online && (watching || (net.snapshot?.spectators ?? 0) > 0 || net.notices.length > 0) && (
        <div className="pointer-events-none fixed inset-x-0 top-14 z-30 flex flex-col items-center gap-2 px-4">
          {watching && (
            <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-sky-300/60 bg-slate-950/90 py-1.5 pl-4 pr-1.5 text-sm font-semibold text-sky-100 shadow-xl shadow-black/40">
              <span>
                👁 Watching{(net.snapshot?.spectators ?? 0) > 1 ? ` · ${net.snapshot?.spectators} watching` : ""}
              </span>
              <button
                onClick={() => {
                  leaveRoom();
                  router.push("/");
                }}
                className="btn-ghost !py-1"
              >
                ← Back to dashboard
              </button>
            </div>
          )}
          {!watching && (net.snapshot?.spectators ?? 0) > 0 && (
            <div className="rounded-full border border-white/25 bg-slate-950/85 px-3 py-1 text-xs font-semibold text-slate-100 shadow-lg shadow-black/40">
              👁 {net.snapshot?.spectators} watching
            </div>
          )}
          {net.notices.map((n) => (
            <button
              key={n.id}
              onClick={() => dismissNotice(n.id)}
              title="Dismiss"
              className="pointer-events-auto max-w-md rounded-2xl border border-amber-300/60 bg-slate-950/90 px-4 py-2 text-left text-sm font-semibold text-amber-100 shadow-xl shadow-black/40"
            >
              👁 {n.text}
            </button>
          ))}
        </div>
      )}

      {welcome && <WelcomeSplash />}
      {turnSplash > 0 && !state.winner && <TurnSplash key={turnSplash} />}
      {online && net.reconnecting && (
        <div role="status" className="pointer-events-none fixed inset-x-0 top-3 z-30 flex justify-center px-4">
          <div className="rounded-full border border-amber-300/60 bg-slate-950/85 px-4 py-2 text-sm font-semibold text-amber-100 shadow-xl shadow-black/40">⟳ Reconnecting to the game server…</div>
        </div>
      )}
      {online && showEndTurn && !state.winner && !targeting && !plan && attacking.length === 0 && (
        <PassReminder state={state} after={state.phase === "main2" && onlyLandsLeft ? REMIND_DONE_MS : REMIND_IDLE_MS} opponent={playerName(other)} onEndTurn={endTurn} />
      )}

      {state.winner && <VictoryDialog
          winner={state.winner}
          reason={endNote ?? (online ? net.snapshot?.endReason ?? null : null)}
          onPlayAgain={startGame}
<<<<<<< HEAD
          you={online && !watching ? actor : undefined}
=======
          you={online ? actor : undefined}
          keep={
            <KeepRandomDecks
              className="mt-4"
              decks={playedDecks}
              saved={savedDecks}
              onSaved={keepDeck}
              label={(who) => (online ? "Save my random deck" : `Save ${playerName(who)}'s deck`)}
              note={online ? "Liked your random cards?" : "Liked the random cards?"}
            />
          }
>>>>>>> 437f1392709f8c4f2684b47c60b2558a0b8f792f
          onLeave={
            online
              ? () => {
                  leaveRoom();
                  router.push("/");
                }
              : undefined
          }
        />}
      {!online && entered > 0 && <EnterBattlefield key={entered} />}
    </main>
  );
}
<<<<<<< HEAD

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
          {zones && (
            // the library, graveyard and exile share the whole height of the mat, and scale with it (a choice panel makes the mat shorter, for example)
            <div className="flex min-h-0 w-44 shrink-0 flex-col gap-1.5 rounded-xl border-2 border-dashed border-white/30 bg-black/25 p-1.5">{zones}</div>
          )}
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
=======
>>>>>>> 437f1392709f8c4f2684b47c60b2558a0b8f792f
