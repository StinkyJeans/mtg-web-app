import type { CardDef, GameState, PlayerId } from "./types.js";

/** The stand-in for a card that `viewFor` hides: a face-down card whose identity the viewer must not learn. */
export const HIDDEN_CARD_ID = "__hidden__";
const HIDDEN_DEF: CardDef = { id: HIDDEN_CARD_ID, name: "Hidden card", type: "other", cost: 0 };

/**
 * What one player is allowed to know about the game, for a server that holds the real state.
 *   - The opponent's hand and both libraries become face-down cards (the cards stay countable, their identity is gone).
 *     The exception: cards a pick is showing to this player (look at the top three, search a library) stay visible to them.
 *   - Definitions of cards the viewer cannot see are removed, so the list of cards can't be used to read the opponent's deck.
 *   - The shuffle seed is removed, so nobody can work out the order of a library.
 * With `seat` null this is the view for someone watching: BOTH hands are face down too, and nothing a pick is showing is revealed.
 * The result is still a valid `GameState`: the engine's own functions (legal actions, castable cards...) work on it for the viewer.
 */
export function viewFor(state: GameState, seat: PlayerId | null): GameState {
  const view = structuredClone(state);
  view.rng = 0;
<<<<<<< HEAD
  const shown = new Set(seat !== null && view.pendingPick && view.pendingPick.player === seat ? view.pendingPick.options : []);
=======
  const pick = view.pendingPick && view.pendingPick.player === seat ? view.pendingPick : null;
  const shown = new Set(pick ? [...pick.options, ...(pick.seen ?? []), ...(pick.bottomIids ?? [])] : []);
>>>>>>> 437f1392709f8c4f2684b47c60b2558a0b8f792f
  const hide = (zone: { iid: string; defId: string }[]) => {
    for (const card of zone) if (!shown.has(card.iid)) card.defId = HIDDEN_CARD_ID;
  };
  for (const id of ["p1", "p2"] as const) {
    hide(view.players[id].library);
    if (id !== seat) hide(view.players[id].hand);
  }
  // keep only the definitions the viewer can still see somewhere in the state
  const rest = JSON.stringify({ ...view, cards: undefined });
  const kept: Record<string, CardDef> = { [HIDDEN_CARD_ID]: HIDDEN_DEF };
  for (const [id, def] of Object.entries(view.cards)) if (rest.includes(JSON.stringify(id))) kept[id] = def;
  view.cards = kept;
  return view;
}

/** What a spectator may see: the board, the graveyards and the stack, but no hand and no library. */
export const spectatorView = (state: GameState): GameState => viewFor(state, null);
