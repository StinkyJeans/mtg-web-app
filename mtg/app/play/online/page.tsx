import type { Metadata } from "next";
import { OnlineGame } from "../Game";

export const metadata: Metadata = { title: "Live match | MTG Duel" };

export default function OnlinePlayPage() {
  return <OnlineGame />;
}
