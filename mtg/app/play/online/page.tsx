import type { Metadata } from "next";
import { OnlineGame } from "../Game";

export const metadata: Metadata = { title: "Live match | DuelRealm MTG" };

export default function OnlinePlayPage() {
  return <OnlineGame />;
}
