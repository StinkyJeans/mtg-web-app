import Logo from "./Logo";
import Link from "next/link";
import LiveWallpaper from "./LiveWallpaper";
import Lobby from "./lobby/Lobby";
import FriendsPanel from "./friends/FriendsPanel";
import ProfileButton from "./profile/ProfileButton";

// small line icons, drawn here so the buttons need no icon library
const icon = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-7 overflow-x-clip p-5 text-white sm:p-8">
      <LiveWallpaper />
      <ProfileButton />
      <FriendsPanel />
      <Lobby />
      <section className="relative flex flex-col items-center gap-5 text-center">
        {/* on a phone the logo and the title give way to the buttons (the name is in the top bar) */}
        <div className="flex flex-col items-center gap-5 max-md:hidden">
        <div className="hero-scrim" aria-hidden="true" />
        <Logo size={124} glow className="hero-rise" />
        <p className="hero-eyebrow hero-rise">A two-player card duel game</p>
        <h1 className="hero-rise flex flex-col items-center gap-4 font-title" style={{ animationDelay: "0.08s" }}>
          <span className="hero-title">DuelRealm</span>
          <span className="hero-mtg">MTG</span>
        </h1>
        <p className="hero-sub hero-rise" style={{ animationDelay: "0.16s" }}>
          Build a deck, join a room, and duel.
        </p>
        </div>
        <div className="hero-rise mt-2 flex flex-wrap justify-center gap-3" style={{ animationDelay: "0.24s" }}>
          <Link href="/play" className="hero-btn hero-btn-primary">
            <svg viewBox="0 0 24 24" {...icon}>
              <path d="M7 4.5v15l12-7.5z" fill="currentColor" />
            </svg>
            Play (hot-seat)
          </Link>
          <Link href="/decks" className="hero-btn">
            <svg viewBox="0 0 24 24" {...icon}>
              <rect x="8" y="3" width="12" height="16" rx="2" />
              <path d="M5 7v13a1 1 0 0 0 1 1h10" />
            </svg>
            Decks
          </Link>
          <Link href="/cards" className="hero-btn">
            <svg viewBox="0 0 24 24" {...icon}>
              <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
              <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
              <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
              <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
            </svg>
            Cards
          </Link>
        </div>
      </section>
    </main>
  );
}
