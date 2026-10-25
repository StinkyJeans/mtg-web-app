import type { Metadata } from "next";
import CardBrowser from "./CardBrowser";

export const metadata: Metadata = { title: "Cards | MTG Duel" };

export default function CardsPage() {
  return <CardBrowser />;
}
