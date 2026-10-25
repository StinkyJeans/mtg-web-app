import type { Metadata } from "next";
import Game from "../Game";

export const metadata: Metadata = { title: "Live match | MTG Duel" };

export default function OnlinePlayPage() {
  return <Game online />;
}
