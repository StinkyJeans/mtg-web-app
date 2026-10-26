"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import type { PlayerId } from "@mtg/engine";
import { OPPONENT } from "@mtg/engine";
import { animationsEnabled } from "@/lib/motion";
import { startConfetti } from "./confetti";
import { playerName } from "./log";

/** Full-screen confetti that plays once when it appears. Doesn't block clicks. */
export function Confetti() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => (canvas.current ? startConfetti(canvas.current) : undefined), []);
  return <canvas ref={canvas} aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 h-screen w-screen" />;
}

/** Asks before a player resigns. Resigning ends the game at once and the other player wins. */
export function ResignDialog({ player, onConfirm, onCancel }: { player: PlayerId; onConfirm: () => void; onCancel: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Resign" className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        <h2 className="text-2xl font-bold text-zinc-900">{playerName(player)}, resign?</h2>
        <p className="mt-2 text-zinc-600">
          Resigning ends the game right now and <span className="font-semibold">{playerName(OPPONENT[player])}</span> wins.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={onConfirm} className="rounded-lg bg-red-600 px-5 py-2.5 font-semibold text-white hover:bg-red-500">
            Resign
          </button>
          <button onClick={onCancel} autoFocus className="rounded-lg border border-zinc-400 px-5 py-2.5 font-semibold text-zinc-800 hover:bg-zinc-100">
            Keep playing
          </button>
        </div>
      </div>
    </div>
  );
}

/** Shown when the game ends: "You win!" for the winner, with confetti. */
export function VictoryDialog({
  winner,
  reason,
  onPlayAgain,
  you,
  onLeave,
  keep,
}: {
  winner: PlayerId | "draw";
  reason: string | null;
  onPlayAgain: () => void;
  /** Online: which player is looking at the screen. */
  you?: PlayerId;
  onLeave?: () => void;
  /** Buttons to keep the random decks that were played. */
  keep?: ReactNode;
}) {
  const lost = you !== undefined && winner !== "draw" && winner !== you;
  return (
    <>
      <div role="dialog" aria-modal="true" aria-label="You win" className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
        <div className={`${animationsEnabled() ? "victory-pop" : ""} w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl`}>
          <div className="text-6xl" aria-hidden="true">
            {winner === "draw" ? "🤝" : lost ? "💀" : "🏆"}
          </div>
          <h2 className="mt-2 text-5xl font-extrabold text-amber-600">{winner === "draw" ? "Draw!" : lost ? "You lost" : "You win!"}</h2>
          <p className="mt-2 text-lg font-semibold text-zinc-900">{winner === "draw" ? "It's a draw" : lost ? `${playerName(winner)} wins this one` : `Congratulations, ${playerName(winner)}`}</p>
          {reason && <p className="mt-1 text-zinc-600">{reason}</p>}
          {keep}
          <div className="mt-6 flex justify-center gap-3">
            {onLeave ? (
              <button onClick={onLeave} className="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-black hover:bg-amber-400">
                Back to the lobby
              </button>
            ) : (
              <>
                <button onClick={onPlayAgain} className="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-black hover:bg-amber-400">
                  Play again
                </button>
                <Link href="/" className="rounded-lg border border-zinc-400 px-6 py-3 font-semibold text-zinc-800 hover:bg-zinc-100">
                  Main menu
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
      {winner !== "draw" && !lost && <Confetti />}
    </>
  );
}
