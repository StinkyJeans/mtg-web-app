import Link from "next/link";
import LiveWallpaper from "./LiveWallpaper";
import Lobby from "./lobby/Lobby";

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-7 p-8 text-white">
      <LiveWallpaper />
      <Lobby />
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="bg-gradient-to-r from-amber-200 via-sky-200 to-rose-200 bg-clip-text text-6xl font-extrabold tracking-tight text-transparent drop-shadow-[0_2px_24px_rgba(167,139,250,0.55)] sm:text-7xl">
          MTG Duel
        </h1>
        <p className="text-lg text-slate-300">A two-player card game for two brothers.</p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/play"
          className="rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 px-8 py-3.5 text-base font-extrabold text-black shadow-lg shadow-amber-500/40 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-amber-400/50"
        >
          Play (hot-seat)
        </Link>
        <Link
          href="/decks"
          className="rounded-xl border border-white/25 bg-white/15 px-7 py-3.5 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/20"
        >
          Decks
        </Link>
        <Link
          href="/cards"
          className="rounded-xl border border-white/25 bg-white/15 px-7 py-3.5 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/20"
        >
          Cards
        </Link>
      </div>
    </main>
  );
}
