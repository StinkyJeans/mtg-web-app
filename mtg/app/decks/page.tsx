import type { Metadata } from "next";
import DeckList from "./DeckList";

export const metadata: Metadata = { title: "Decks | MTG Duel" };

export default function DecksPage() {
  return <DeckList />;
}
