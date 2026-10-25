import type { Metadata } from "next";
import Game from "./Game";

export const metadata: Metadata = { title: "Play | MTG Duel" };

export default function PlayPage() {
  return <Game />;
}
