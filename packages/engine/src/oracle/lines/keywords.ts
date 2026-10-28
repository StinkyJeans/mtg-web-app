import type { ParsedCard } from "../../effects.js";
import type { Keyword } from "../../keywords.js";
import { COLOR_OF, isKeyword, singularType } from "../words.js";
import { TOKEN_COLOR } from "../sentences.js";

// Keyword lines, and the rules of attacking and blocking. Each reader takes one line of a permanent's text and says whether it read it.

const WARD = /^ward (\{[^}]+\}(?:\{[^}]+\})*)$/;

const PROTECTION_PART = /^protection from ((?:white|blue|black|red|green|artifacts)(?:(?:,| and)? (?:and )?(?:from )?(?:white|blue|black|red|green|artifacts))*)$/;

// "Ward {1}", "Flying, ward {2}", "Ward—Pay 3 life", "Ward—{2}, Pay 2 life"
export function readWard(line: string, out: ParsedCard): boolean {
  const life = /^ward—(?:((?:\{[^}]+\})+), )?pay (\d+) life$/.exec(line);
  if (life) {
    out.ward = life[1] ?? "";
    out.wardLife = Number(life[2]);
    return true;
  }
  const wardParts = line.split(/,\s+(?=[a-z])/);
  if (wardParts.some((p) => WARD.test(p)) && wardParts.every((p) => WARD.test(p) || isKeyword(p) || PROTECTION_PART.test(p))) {
    out.ward = wardParts.map((p) => WARD.exec(p)?.[1]).find(Boolean);
    if (wardParts.every((p) => !PROTECTION_PART.test(p))) return true;
  }
  return false;
}

// "Protection from red", "Flying, protection from black", "Protection from white and from blue"
export function readProtection(line: string, out: ParsedCard): boolean {
  const parts = line.split(/,\s+(?=[a-z])/);
  if (parts.some((p) => PROTECTION_PART.test(p)) && parts.every((p) => PROTECTION_PART.test(p) || WARD.test(p) || isKeyword(p))) {
    const protection = out.protection ?? { colors: [], artifacts: false };
    for (const p of parts) {
      for (const word of PROTECTION_PART.exec(p)?.[1].match(/white|blue|black|red|green|artifacts/g) ?? []) {
        if (word === "artifacts") protection.artifacts = true;
        else if (!protection.colors.includes(TOKEN_COLOR[word])) protection.colors.push(TOKEN_COLOR[word]);
      }
    }
    out.protection = protection;
    return true;
  }
  return false;
}

// "Flying, first strike": keywords are checked from the card's keyword list, so just accept the line.
export function readKeywordLine(line: string, out: ParsedCard): boolean {
  if (line.split(",").every((w) => isKeyword(w.trim()))) return true;
  return false;
}

// "Toxic 2"
export function readToxic(line: string, out: ParsedCard): boolean {
  const m = /^toxic (\d+)$/.exec(line);
  if (!m) return false;
  out.toxic = (out.toxic ?? 0) + Number(m[1]);
  return true;
}

export function readNoRulesEffect(line: string, out: ParsedCard): boolean {
  if (/^(?:devoid|partner|changeling)$/.test(line)) return true;
  return false;
}

export function readLandwalk(line: string, out: ParsedCard): boolean {
  const walk = /^(plains|island|swamp|mountain|forest)walk$/.exec(line);
  if (walk) {
    (out.landwalk ??= []).push(walk[1]);
    return true;
  }
  return false;
}

export function readAttacksEachCombat(line: string, out: ParsedCard): boolean {
  if (line === "~ attacks each combat if able") {
    out.mustAttack = true;
    return true;
  }
  return false;
}

// "Can't be blocked except by walls and/or creatures with flying"
export function readBlockedOnlyBy(line: string, out: ParsedCard): boolean {
  const only = /^~ can't be blocked except by (.+)$/.exec(line);
  if (only) {
    const rule = { subtypes: [] as string[], keywords: [] as Keyword[], colors: [] as string[], artifact: false };
    for (const term of only[1].split(/ and\/or | or /)) {
      const t = term.trim();
      if (t === "walls") rule.subtypes.push("Wall");
      else if (t === "artifact creatures") rule.artifact = true;
      else if (/^creatures with (flying|reach|flying or reach)$/.test(t)) rule.keywords.push(...(t.endsWith("flying or reach") ? (["flying", "reach"] as Keyword[]) : [t.split(" ").pop() as Keyword]));
      else if (/^(white|blue|black|red|green) creatures$/.test(t)) rule.colors.push(COLOR_OF[t.split(" ")[0]]);
      else {
        out.unsupported.push(line);
        return true;
      }
    }
    out.blockedOnlyBy = rule;
    return true;
  }
  return false;
}

export function readBlockedByOneAtMost(line: string, out: ParsedCard): boolean {
  if (line === "~ can't be blocked by more than one creature") {
    out.maxBlockers = 1;
    return true;
  }
  return false;
}

export function readCantBlock(line: string, out: ParsedCard): boolean {
  if (line === "~ can't block") {
    out.cantBlock = true;
    return true;
  }
  return false;
}

export function readBlockedByPower(line: string, out: ParsedCard): boolean {
  const power = /^~ can't be blocked by creatures with power (\d+) or (less|greater)$/.exec(line);
  if (power) {
    out.cantBeBlockedByPower = { n: Number(power[1]), op: power[2] === "less" ? "max" : "min" };
    return true;
  }
  return false;
}

export function readAttackOnlyIfDefenderHas(line: string, out: ParsedCard): boolean {
  const attackUnless = /^~ can't attack unless defending player controls an? (island|swamp|mountain|forest|plains)$/.exec(line);
  if (attackUnless) {
    out.attackOnlyIfDefenderControls = attackUnless[1].charAt(0).toUpperCase() + attackUnless[1].slice(1);
    return true;
  }
  return false;
}

export function readAttackOnlyWithMoreCreatures(line: string, out: ParsedCard): boolean {
  if (line === "~ can't attack unless you control more creatures than defending player") {
    out.attackIfMoreCreatures = true;
    return true;
  }
  return false;
}

export function readBlockOnlyWithMoreCreatures(line: string, out: ParsedCard): boolean {
  if (line === "~ can't block unless you control more creatures than attacking player") {
    out.blockIfMoreCreatures = true;
    return true;
  }
  return false;
}

export function readUnblockableByColor(line: string, out: ParsedCard): boolean {
  const noBlockColor = /^~ can't be blocked by (white|blue|black|red|green) creatures$/.exec(line);
  if (noBlockColor) {
    out.cantBeBlockedByColors = [...(out.cantBeBlockedByColors ?? []), COLOR_OF[noBlockColor[1]]];
    return true;
  }
  return false;
}

export function readCreaturesAttackEachCombat(line: string, out: ParsedCard): boolean {
  if (line === "creatures you control attack each combat if able") {
    (out.statics ??= []).push({ scope: "yours", mustAttack: true, power: 0, toughness: 0, keywords: [] });
    return true;
  }
  return false;
}

// "Other Goblin creatures you control attack each combat if able."
export function readTypeAttacksEachCombat(line: string, out: ParsedCard): boolean {
  const forceAttack = /^other ([a-z]+) creatures you control attack each combat if able$/.exec(line);
  if (forceAttack) {
    (out.statics ??= []).push({ scope: "yours", other: true, subtypes: [singularType(forceAttack[1])], mustAttack: true, power: 0, toughness: 0, keywords: [] });
    return true;
  }
  return false;
}

export function readAllMustBlock(line: string, out: ParsedCard): boolean {
  if (line === "all creatures able to block ~ do so") {
    out.lureAll = true;
    return true;
  }
  return false;
}

export function readBlocksOnlyFlyers(line: string, out: ParsedCard): boolean {
  if (line === "~ can block only creatures with flying") {
    out.blocksOnlyFlying = true;
    return true;
  }
  return false;
}

export function readCantAttackOrBlockAlone(line: string, out: ParsedCard): boolean {
  if (line === "~ can't attack or block alone") {
    out.cantAttackAlone = true;
    return true;
  }
  return false;
}

export function readUnblockable(line: string, out: ParsedCard): boolean {
  if (line === "~ can't be blocked") {
    out.cantBeBlocked = true;
    return true;
  }
  return false;
}
