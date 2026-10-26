

// Helpers shared by combat (actions.ts) and the stack (stack.ts): reading permanents, moving cards between
// zones, dealing damage, running effects, and state-based actions.

export {
  bindSpecs,
  cardMatches,
  countFor,
  dynamicCount,
  entersTappedNow,
  findPermanent,
  findPermanentOrNull,
  forbidden,
  isArtifactDef,
  isCreature,
  isEnchantmentDef,
  isPermanentCard,
  isPlaneswalker,
  isProtectedFrom,
  kw,
  lethalFor,
  nameOf,
  newId,
  onBoard,
  playerLabel,
  playerToAct,
  powerOf,
  qualityOfDef,
  shiftTargets,
  staticEffectsOn,
  subtypesOf,
  toughnessOf,
} from "./core/permanents.js";
export {
  changeLife,
  counterStackItem,
  drawCards,
  exilePlayable,
  exilePlayTerms,
  isToken,
  makeToken,
  onLifeGained,
  putCounters,
  putIntoGraveyard,
  regenerateInstead,
  removeFromBattlefield,
  spellLeavesStack,
} from "./core/zones.js";
export { askAsEnters, creatureEntered, landEntered, queueTriggers, queueWard } from "./core/triggers.js";
export { isLegalTarget, legalTargets } from "./core/targets.js";
export { runEffects } from "./core/runEffects.js";
export { dealDamage } from "./core/handlers/shared.js";
export { checkStateBasedActions } from "./core/sba.js";

export type { RunContext } from "./effects.js";
