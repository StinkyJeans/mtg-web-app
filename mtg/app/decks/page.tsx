import type { Metadata } from "next";
import DeckList from "./DeckList";

export const metadata: Metadata = { title: "Decks | DuelRealm MTG" };

export default function DecksPage() {
  return <DeckList />;
}
