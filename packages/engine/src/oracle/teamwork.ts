// Teamwork (Marvel Super Heroes): "As an additional cost to cast this spell, you may tap any number of creatures you control with
// total power N or more." Doing so is read like kicking the spell, so "if this spell was cast using teamwork" becomes "if ~ was kicked".

/** "Choose one. If this spell was cast using teamwork, choose both instead." */
export const TEAMWORK_HEADER = /^choose one\. if ~ was cast using teamwork, choose both instead\.?$/;

/** The name of a mode: "• Street Justice — Exile target creature ..." (the text is already lower case). */
export const stripModeName = (bullet: string): string => bullet.replace(/^[a-z' ]+ — /, "");

/**
 * A few teamwork spells word their upgrade in a way the sentence reader can't follow ("instead choose target creature card").
 * They are rewritten into the same meaning in plain words. `lift`: the first target's limit (mana value) is waived when it was
 * cast using teamwork.
 */
export function rewriteTeamwork(text: string): { text: string; lift: boolean } {
  let lift = false;
  const out = text
    // Cruel Alliance: "Exile target creature with mana value 3 or less. If ~ was cast using teamwork, instead exile target creature and you gain 3 life."
    .replace(/^(exile target creature with mana value \d+ or less)\. if ~ was cast using teamwork, instead exile target creature and you gain (\d+) life\.?$/, (_, first: string, n: string) => {
      lift = true;
      return `${first}. if ~ was cast using teamwork, you gain ${n} life`;
    })
    // Too Evil to Stay Dead: "Choose target creature card in your graveyard with mana value 4 or less. If ~ was cast using teamwork, instead choose target creature card in your graveyard. Return the chosen card to the battlefield."
    .replace(/^choose (target creature card) in your graveyard( with mana value \d+ or less)\. if ~ was cast using teamwork, instead choose target creature card in your graveyard\. return the chosen card to the battlefield\.?$/, (_, what: string, limit: string) => {
      lift = true;
      return `return ${what}${limit} from your graveyard to the battlefield`;
    })
    // We Say Thee Nay!: "... unless its controller pays {2}. Counter that spell unless its controller pays {4} instead if this spell was cast using teamwork."
    .replace(/\. (counter that spell unless its controller pays (?:\{[^}]+\})+) instead if ~ was cast using teamwork\.?$/, ". if ~ was cast using teamwork, $1 instead");
  return { text: out, lift };
}
