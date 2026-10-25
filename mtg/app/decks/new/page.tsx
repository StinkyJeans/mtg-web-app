import type { Metadata } from "next";
import DeckEditor from "../DeckEditor";

export const metadata: Metadata = { title: "New deck | MTG Duel" };

export default function NewDeckPage() {
  return <DeckEditor />;
}
