"use client";

/** The home page's main button: opens the "Create room" window (the lobby on this page listens for it). */
export default function CreateRoomButton() {
  return (
    <button onClick={() => window.dispatchEvent(new Event("mtg-create-room"))} className="hero-btn hero-btn-primary">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
      Create room
    </button>
  );
}
