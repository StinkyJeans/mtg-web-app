import type { StackItem } from "./effects.js";

// The stack (rule 405) and priority (rule 117), in a simplified but faithful form:
//  - Casting a spell or activating an ability puts it on the stack and gives the OTHER player priority.
//  - A player with nothing they could cast or activate is skipped automatically, so most plays resolve at once.
//  - When both players pass in a row, the top item resolves; the round goes on while the stack isn't empty.

export { canCastNow, holdsPriority } from "./stack/shared.js";
export { activateAbility, activateLoyalty, castCostOf, castSpell, costChoices, crewVehicle, cycleCard, liftedSpecs } from "./stack/cast.js";
export { abilityLockReason, getActivatable, getCastable, getCrewable, getCyclable, getLoyaltyAbilities, hasResponse } from "./stack/options.js";
export type { Activatable, Castable, Crewable, Cyclable, LoyaltyOption } from "./stack/options.js";
export { chooseTargets, fizzleReason, openWindow, passPriority, settle } from "./stack/resolve.js";
export { pickCard } from "./stack/pick.js";
export type { Outcome } from "./stack/outcome.js";

export type { StackItem };
