"use client";

import type { ReactNode } from "react";
import type { PlayerId } from "@mtg/engine";
import { OPPONENT } from "@mtg/engine";
import { animationsEnabled } from "@/lib/motion";
import ConfirmDialog from "../ConfirmDialog";
import { playerName } from "./log";

/** Asks before a player resigns. Resigning ends the game at once and the other player wins. */
export function ResignDialog({ player, onConfirm, onCancel }: { player: PlayerId; onConfirm: () => void; onCancel: () => void }) {
  return (
    <ConfirmDialog
      title={`${playerName(player)}, resign?`}
      message={`Resigning ends the game right now and ${playerName(OPPONENT[player])} wins.`}
      confirmLabel="Resign"
      cancelLabel="Keep playing"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

/** A gold cup: the winner's medal. */
function Trophy() {
  return (
    <svg viewBox="0 0 64 64" width="74" height="74" aria-hidden="true" className="victory-icon">
      <defs>
        <linearGradient id="trophy-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3c4" />
          <stop offset="0.45" stopColor="#f4b43d" />
          <stop offset="1" stopColor="#b9731a" />
        </linearGradient>
      </defs>
      <path d="M19 9h26v15c0 9.5-5.5 16-13 16s-13-6.5-13-16V9z" fill="url(#trophy-gold)" stroke="#7a4a0e" strokeWidth="1.5" />
      <path d="M19 13H11c0 9 3.5 14 10 15.5M45 13h8c0 9-3.5 14-10 15.5" fill="none" stroke="url(#trophy-gold)" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M29 40h6v7h-6z" fill="url(#trophy-gold)" stroke="#7a4a0e" strokeWidth="1.2" />
      <path d="M22 54h20v4H22zM26 47h12v7H26z" fill="url(#trophy-gold)" stroke="#7a4a0e" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M32 15l2.4 5 5.4.7-4 3.7 1 5.3-4.8-2.7-4.8 2.7 1-5.3-4-3.7 5.4-.7z" fill="#fff8dc" opacity="0.92" />
      <path d="M23 12v14" stroke="#fffbe6" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

/** A cracked shield: for the player who lost. */
function BrokenShield() {
  return (
    <svg viewBox="0 0 64 64" width="70" height="70" aria-hidden="true" className="victory-icon">
      <defs>
        <linearGradient id="shield-steel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cbd5e1" />
          <stop offset="1" stopColor="#475569" />
        </linearGradient>
      </defs>
      <path d="M32 7l19 6.5V29c0 12.5-8.2 21-19 25.5C21.2 50 13 41.5 13 29V13.5L32 7z" fill="url(#shield-steel)" stroke="#1e293b" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M34 9l-6 14 8 6-7 10 5 8" fill="none" stroke="#fb7185" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Balanced scales: nobody won. */
function Scales() {
  return (
    <svg viewBox="0 0 64 64" width="70" height="70" aria-hidden="true" className="victory-icon" fill="none" stroke="#e2e8f0" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M32 8v44M22 52h20M12 18h40" />
      <path d="M12 18l-7 16h14zM52 18l-7 16h14z" />
      <path d="M5 34c0 4 3 6 7 6s7-2 7-6M45 34c0 4 3 6 7 6s7-2 7-6" />
    </svg>
  );
}

/** Shown when the game ends: Victory, Defeat, or a Draw. */
export function VictoryDialog({
  winner,
  reason,
  you,
  onLeave,
  keep,
  rematch,
  series,
}: {
  winner: PlayerId | "draw";
  reason: string | null;
  /** Online: which player is looking at the screen. */
  you?: PlayerId;
  onLeave?: () => void;
  /** Buttons to keep the random decks that were played. */
  keep?: ReactNode;
  /** Online, best of 3 or 5: the score; while the series goes on there is a "Next game" button instead of a rematch. */
  series?: { bestOf: number; game: number; wins: Record<PlayerId, number>; decided: boolean; ready: PlayerId[]; you: PlayerId; opponent: string; onReady: () => void };
  /** Online: asking the other player for another game. */
  rematch?: { state: "none" | "sent" | "incoming"; opponent: string; onAsk: () => void; onCancel: () => void; onAccept: () => void; onDecline: () => void };
}) {
  const lost = you !== undefined && winner !== "draw" && winner !== you;
  const result = winner === "draw" ? "draw" : lost ? "lose" : "win";
  const title = result === "draw" ? "Draw" : result === "lose" ? "Defeat" : "Victory";
  const spin = animationsEnabled();
  return (
    <>
      <div role="dialog" aria-modal="true" aria-label={result === "win" ? "You win" : result === "lose" ? "You lost" : "Draw"} className="victory-backdrop">
        <div data-result={result} className={`victory-card ${spin ? "victory-pop" : ""}`}>
          {result === "win" && <div aria-hidden="true" className={`victory-rays ${spin ? "victory-rays-turn" : ""}`} />}
          <div className="victory-medal">{result === "draw" ? <Scales /> : result === "lose" ? <BrokenShield /> : <Trophy />}</div>
          <h2 className="victory-title">{title}</h2>
          <p className="victory-sub">{result === "draw" ? "Neither player wins this one" : result === "lose" ? `${playerName(winner as PlayerId)} wins this one` : `Congratulations, ${playerName(winner as PlayerId)}!`}</p>
          {reason && <p className="victory-reason">{reason}</p>}
          {series && (
            <p className="victory-reason !text-[#fde68a]">
              {series.decided
                ? `${series.wins[series.you] > series.wins[OPPONENT[series.you]] ? "You won" : "You lost"} the best of ${series.bestOf}: ${series.wins[series.you]} – ${series.wins[OPPONENT[series.you]]}`
                : `Game ${series.game} of up to ${series.bestOf}. Score: you ${series.wins[series.you]} – ${series.wins[OPPONENT[series.you]]} ${series.opponent}`}
            </p>
          )}
          {keep}
          {rematch?.state === "incoming" && (
            <p role="status" className="victory-reason !text-[#fde68a]">
              {rematch.opponent} wants a rematch.
            </p>
          )}
          {rematch?.state === "sent" && (
            <p role="status" className="victory-reason">
              Rematch asked. Waiting for {rematch.opponent} to answer…
            </p>
          )}
          <div className="victory-actions">
            {rematch?.state === "none" && (
              <button onClick={rematch.onAsk} className="btn-gold !px-7 !py-3 !text-base">
                Rematch
              </button>
            )}
            {rematch?.state === "sent" && (
              <button onClick={rematch.onCancel} className="btn-ghost !px-6 !py-3 !text-base">
                Cancel rematch
              </button>
            )}
            {rematch?.state === "incoming" && (
              <>
                <button onClick={rematch.onAccept} autoFocus className="btn-gold !px-7 !py-3 !text-base">
                  Accept
                </button>
                <button onClick={rematch.onDecline} className="btn-danger !px-6 !py-3 !text-base">
                  Reject
                </button>
              </>
            )}
            {series && !series.decided && (
              series.ready.includes(series.you) ? (
                <p role="status" className="victory-reason">Waiting for {series.opponent} to be ready…</p>
              ) : (
                <button onClick={series.onReady} autoFocus className="btn-gold !px-7 !py-3 !text-base">
                  Next game
                </button>
              )
            )}
            {onLeave && (
              <button onClick={onLeave} autoFocus={!series || series.decided} className="btn-gold !px-7 !py-3 !text-base">
                Back to the lobby
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
