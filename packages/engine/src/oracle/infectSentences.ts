import type { EdictType, Effect } from "../effects.js";
import { isPlayerRef, refFor } from "./targets.js";
import type { Ctx } from "./targets.js";

// Sentences of the Mono-Black Infect deck: proliferate and edicts.

type SentenceParser = (s: string, ctx: Ctx) => Effect[] | null;

const EDICT_TYPES: EdictType[] = ["creature", "planeswalker", "artifact", "enchantment"];

const proliferate: SentenceParser = (s) => (s === "proliferate" || s === "you proliferate" ? [{ type: "proliferate" }] : null);

/** Vraska's Fall: "Each opponent sacrifices a creature or planeswalker of their choice." */
const edict: SentenceParser = (s, ctx) => {
  const m = /^(each opponent|target opponent|target player) sacrifices an? ([a-z ]+?)(?: of their choice)?$/.exec(s);
  const types = m?.[2].split(" or ") ?? [];
  if (!m || !types.every((t): t is EdictType => (EDICT_TYPES as string[]).includes(t))) return null;
  const who = refFor(m[1], ctx);
  return who && isPlayerRef(who, ctx) ? [{ type: "edict", who, types }] : null;
};

export const INFECT_SENTENCES: SentenceParser[] = [proliferate, edict];
