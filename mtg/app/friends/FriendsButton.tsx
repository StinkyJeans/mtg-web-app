"use client";

/** A phone has no room for the friends list on the page: this button (beside the bell) opens it as a pop-up. */
export default function FriendsButton() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event("mtg-open-friends"))}
      aria-label="Open your friends"
      title="Friends"
      className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-slate-950/55 text-white shadow-xl shadow-black/40 ring-1 ring-inset ring-white/10 transition hover:bg-slate-900/70 md:hidden"
    >
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20v-1a6 6 0 0 1 6-6h1a6 6 0 0 1 6 6v1" />
        <circle cx="17.5" cy="9" r="2.5" />
        <path d="M17.5 14a4.5 4.5 0 0 1 4 4.5V20" />
      </svg>
    </button>
  );
}
