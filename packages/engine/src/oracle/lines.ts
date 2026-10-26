import type { ParsedCard } from "../effects.js";
import { readWard, readProtection, readKeywordLine, readNoRulesEffect, readLandwalk, readAttacksEachCombat, readBlockedOnlyBy, readBlockedByOneAtMost, readCantBlock, readBlockedByPower, readAttackOnlyIfDefenderHas, readAttackOnlyWithMoreCreatures, readBlockOnlyWithMoreCreatures, readUnblockableByColor, readCreaturesAttackEachCombat, readTypeAttacksEachCombat, readAllMustBlock, readBlocksOnlyFlyers, readCantAttackOrBlockAlone, readUnblockable } from "./lines/keywords.js";
import { readStatsEqualToCount, readAuraTarget, readStaticAbility, readCostLessIfYouControl, readIfDrawnCards, readTypedSpellsCostLess, readCheaperOnOtherTurns, readBigSpellsCostLess, readDuringYourTurn, readAsLongAsYouControl, readWhileAttacking, readAttackingAnthem, readPowerEqualToCount, readTargetingTax, readEnteredThisTurnStatic, readGrantedLandMana, readHostBecomes, readTappedCreaturesHave, readLifeTotalStatic, readTwoTypeLord, readLord, readIgnoresHexproof } from "./lines/statics.js";
import { readEntersWithCounters, readEntersWithMinusCounters, readKickedCounters, readChooseColorOnEnter, readOthersEnterWithCounters, readEntersTappedUnless, readPreventNoncombatDamage, readGrantsLifeGainCounters, readDrawsTwoInstead, readGainLifePlusOne, readGainTwiceLife, readEntersPrepared, readEntersTapped } from "./lines/entering.js";
import { readLifeGainedTrigger, readLandfall, readAttackWithOthers, readBecomesTarget, readCastSpellTrigger, readDrawCardTrigger, readEnchantedDealsDamage, readPackTactics, readBeginningOfStep, readAnySpellCast, readAllyDies, readCountersPutOnAlly, readAnotherCreatureEntersOrLeaves, readBlocksOrBlocked, readDamagedCreatureDies, readEerie, readReturnWhenHostDies, readTapXOnEnter, readDiesReturnsToBattlefield, readAllyEnters, readYouAttack, readSelfTrigger, readTrigger, readAllyAttacks, readToSolve } from "./lines/triggers.js";
import { readLoyaltyAbility, readCrew, readEquip, readSacrificeForMana, readLandcycling, readActivatedAbility, readRestrictedMana, readSolvedAbility } from "./lines/activated.js";

// One line of a permanent's text: a keyword, a triggered, activated or static ability, an aura or equipment line.
// Each kind of line has a reader in lines/.

/** The readers in the order they are tried. The first one that reads the line wins, so a more specific sentence must come before a general one. */
const READERS: ((line: string, out: ParsedCard) => boolean)[] = [
  readLoyaltyAbility,
  readWard,
  readLifeGainedTrigger,
  readLandfall,
  readProtection,
  readStatsEqualToCount,
  readAuraTarget,
  readStaticAbility,
  readKeywordLine,
  readEntersWithCounters,
  readNoRulesEffect,
  readCrew,
  readLandwalk,
  readAttacksEachCombat,
  readEquip,
  readSacrificeForMana,
  readEntersWithMinusCounters,
  readKickedCounters,
  readChooseColorOnEnter,
  readOthersEnterWithCounters,
  readBlockedOnlyBy,
  readBlockedByOneAtMost,
  readCantBlock,
  readCostLessIfYouControl,
  readIfDrawnCards,
  readAttackWithOthers,
  readBecomesTarget,
  readEntersTappedUnless,
  readBlockedByPower,
  readAttackOnlyIfDefenderHas,
  readCastSpellTrigger,
  readLandcycling,
  readDrawCardTrigger,
  readAttackOnlyWithMoreCreatures,
  readBlockOnlyWithMoreCreatures,
  readUnblockableByColor,
  readTypedSpellsCostLess,
  readCheaperOnOtherTurns,
  readBigSpellsCostLess,
  readDuringYourTurn,
  readAsLongAsYouControl,
  readWhileAttacking,
  readAttackingAnthem,
  readEnchantedDealsDamage,
  readPackTactics,
  readCreaturesAttackEachCombat,
  readTypeAttacksEachCombat,
  readPowerEqualToCount,
  readTargetingTax,
  readBeginningOfStep,
  readAnySpellCast,
  readAllyDies,
  readCountersPutOnAlly,
  readAnotherCreatureEntersOrLeaves,
  readBlocksOrBlocked,
  readPreventNoncombatDamage,
  readGrantsLifeGainCounters,
  readDrawsTwoInstead,
  readGainLifePlusOne,
  readGainTwiceLife,
  readEnteredThisTurnStatic,
  readGrantedLandMana,
  readHostBecomes,
  readTappedCreaturesHave,
  readLifeTotalStatic,
  readTwoTypeLord,
  readLord,
  readAllMustBlock,
  readDamagedCreatureDies,
  readBlocksOnlyFlyers,
  readCantAttackOrBlockAlone,
  readEerie,
  readReturnWhenHostDies,
  readTapXOnEnter,
  readDiesReturnsToBattlefield,
  readEntersPrepared,
  readAllyEnters,
  readAllyAttacks,
  readYouAttack,
  readUnblockable,
  readEntersTapped,
  readSelfTrigger,
  readEitherTrigger,
  readTrigger,
  readIgnoresHexproof,
  readToSolve,
  readRestrictedMana,
  readSolvedAbility,
  readActivatedAbility,
];

export function parseCreatureLine(rawLine: string, out: ParsedCard): void {
  // "... This ability triggers only once each turn.": read the line without it, then mark the triggers it produced.
  const once = /\.? this ability triggers only once each turn\.?$/.exec(rawLine);
  if (once) {
    const before = out.triggers.length;
    // Only once each turn, "whenever one or more other creatures ... enter" is the same as "whenever another creature ... enters".
    const head = rawLine.slice(0, once.index).replace(/^whenever one or more other creatures you control( with power \d+ or less)? enter,/, "whenever another creature you control$1 enters,");
    parseCreatureLine(head, out);
    for (let i = before; i < out.triggers.length; i++) out.triggers[i] = { ...out.triggers[i], oncePerTurn: true };
    return;
  }
  const line = rawLine.replace(/\.$/, "").replace(/^raid — /, "");

  for (const read of READERS) if (read(line, out)) return;
  out.unsupported.push(line);
}

// "When this creature enters or dies, mill two cards.": two triggers with the same effect
function readEitherTrigger(line: string, out: ParsedCard): boolean {
  const either = /^when(?:ever)? ~ (enters|attacks) or (dies|attacks),? (.+)$/.exec(line);
  if (either && either[1] !== either[2]) {
    const before = out.triggers.length;
    parseCreatureLine(`when ~ ${either[1]}, ${either[3]}`, out);
    parseCreatureLine(`whenever ~ ${either[2]}, ${either[3]}`, out);
    if (out.triggers.length === before + 2) out.triggers[before].text = out.triggers[before + 1].text = line;
    return true;
  }
  return false;
}
