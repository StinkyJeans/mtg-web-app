import type { DeckChoice } from "@/lib/decks";

/** The options of a "choose your deck" menu: the player's own decks of that size, then the ready-made ones, then a random deck. */
export default function DeckOptions({ choices, size, randomId }: { choices: DeckChoice[]; size: number; randomId: string }) {
  const fits = choices.filter((c) => c.ids.length === size);
  const groups = [
    { label: "My decks", decks: fits.filter((c) => !c.official) },
    { label: "Ready-made decks", decks: fits.filter((c) => c.official) },
  ].filter((g) => g.decks.length > 0);
  return (
    <>
      {groups.map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.decks.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </optgroup>
      ))}
      <option value={randomId}>Random {size}-card deck</option>
    </>
  );
}
