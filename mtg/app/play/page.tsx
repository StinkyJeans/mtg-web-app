import type { Metadata } from "next";
import Game from "./Game";

export const metadata: Metadata = { title: "Play | DuelRealm MTG" };

export default function PlayPage() {
  return <Game />;
}
