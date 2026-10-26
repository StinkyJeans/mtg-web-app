import type { Metadata } from "next";
import DeckEditor from "../DeckEditor";

export const metadata: Metadata = { title: "New deck | DuelRealm MTG" };

export default function NewDeckPage() {
  return <DeckEditor />;
}
