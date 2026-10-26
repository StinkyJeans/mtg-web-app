"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import NotificationBell from "./NotificationBell";
import { holdWallpaper } from "../LiveWallpaper";
import { RowSkeletons, Skeleton } from "../Skeleton";
import DeckPreview from "../decks/DeckPreview";
import { deckStatus, listMyDecks, loadDeckPreview, loadDefsFor } from "@/lib/decks";
import { onIntent } from "@/lib/prefetch";
import { cleanNickname, loadMe, loadStats, MAX_NICKNAME, saveAvatar, saveNickname, squarePicture } from "@/lib/profile";
import type { Me, Stats } from "@/lib/profile";

interface DeckLine {
  id: string;
  name: string;
  cards: number;
  ready: boolean;
  problems: number;
}

/** A round picture, or the first letter of the name on a colored circle. */
function Avatar({
  me,
  size,
  className = "",
}: {
  me: Me;
  size: number;
  className?: string;
}) {
  return me.avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={me.avatar}
      alt=""
      width={size}
      height={size}
      className={`shrink-0 rounded-full object-cover ring-2 ring-white/40 ${className}`}
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-600 font-extrabold text-black ring-2 ring-white/40 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {(me.nickname || me.name).charAt(0).toUpperCase()}
    </span>
  );
}

/** Top left of the dashboard: your picture and name. Click it for your profile: picture, record and decks. */
export default function ProfileButton() {
  const [me, setMe] = useState<Me | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    void loadMe().then((m) => alive && setMe(m));
    return () => {
      alive = false;
    };
  }, []);

  if (!me) return null;
  return (
    <>
      <div className="z-20 flex items-center gap-2 self-start xl:fixed xl:left-4 xl:top-14 xl:self-auto">
      <button
        onClick={() => setOpen(true)}
        aria-label="Open your profile"
        className="flex max-w-[min(20rem,calc(100vw-6rem))] items-center gap-3 rounded-2xl border border-white/25 bg-slate-950/55 py-2 pl-2 pr-4 text-left text-white shadow-xl shadow-black/40 ring-1 ring-inset ring-white/10 transition hover:-translate-y-0.5 hover:bg-slate-900/70"
      >
        <Avatar me={me} size={44} />
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-bold">
            {me.nickname || me.name}
          </span>
          <span className="block text-xs text-slate-300">
            Profile · record · decks
          </span>
        </span>
      </button>
      <NotificationBell meId={me.id} meName={me.nickname || me.name} />
      </div>
      {open && (
        <ProfilePopup me={me} onMe={setMe} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function ProfilePopup({
  me,
  onMe,
  onClose,
}: {
  me: Me;
  onMe: (m: Me) => void;
  onClose: () => void;
}) {
  useEffect(() => holdWallpaper(), []);
  const file = useRef<HTMLInputElement>(null);
  const [stats, setStats] = useState<Stats | null | "error">(null);
  const [decks, setDecks] = useState<DeckLine[] | null | "error">(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [viewing, setViewing] = useState<DeckLine | null>(null); // the deck open in its own pop-up

  // Esc closes the profile, unless a deck is open on top (then the deck's own Esc closes just that).
  useEffect(() => {
    if (viewing) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewing, onClose]);

  useEffect(() => {
    let alive = true;
    loadStats(me.id)
      .then((s) => alive && setStats(s))
      .catch(() => alive && setStats("error"));
    listMyDecks()
      .then(async (list) => {
        const defs = await loadDefsFor(list);
        return list.map((d): DeckLine => {
          const st = deckStatus(defs, d.entries);
          return {
            id: d.id,
            name: d.name,
            cards: st.count,
            ready: st.ready,
            problems: st.errors.length + st.unplayable.length,
          };
        });
      })
      .then((l) => alive && setDecks(l))
      .catch(() => alive && setDecks("error"));
    return () => {
      alive = false;
    };
  }, [me.id]);

  async function choose(f: File) {
    setBusy(true);
    setProblem(null);
    try {
      const url = await saveAvatar(await squarePicture(f));
      onMe({ ...me, avatar: url });
    } catch (e) {
      setProblem(
        e instanceof Error ? e.message : "Could not save the picture.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setProblem(null);
    try {
      await saveAvatar(null);
      onMe({ ...me, avatar: null });
    } catch (e) {
      setProblem(
        e instanceof Error ? e.message : "Could not remove the picture.",
      );
    } finally {
      setBusy(false);
    }
  }

  const total =
    stats && stats !== "error" ? stats.wins + stats.losses + stats.draws : 0;
  const rate =
    stats && stats !== "error" && total > 0
      ? Math.round((stats.wins / total) * 100)
      : null;

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Your profile"
        onClick={onClose}
        className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="panel-glass flex max-h-[92dvh] w-full max-w-2xl flex-col gap-6 overflow-y-auto p-6 text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.5)] sm:p-7"
        >
          {/* who you are, and the picture */}
          <header className="flex items-center gap-4">
            <div className="group relative">
              <Avatar me={me} size={96} />
              <button
                onClick={() => file.current?.click()}
                disabled={busy}
                aria-label="Change your picture"
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 text-xs font-bold opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
              >
                {busy ? "Saving…" : "Change"}
              </button>
              <input
                ref={file}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void choose(f);
                  e.target.value = "";
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-xs font-bold uppercase tracking-[0.3em] text-[#ffe29a]">
                Profile
              </p>
              <h2 className="page-title truncate !text-3xl !tracking-wide" style={{ textTransform: "none" }}>{me.nickname || me.name}</h2>
              {me.nickname && <p className="truncate text-sm text-slate-300">@{me.name}</p>}
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
                <button
                  onClick={() => file.current?.click()}
                  disabled={busy}
                  className="btn-gold"
                >
                  {me.avatar ? "Change picture" : "Add a picture"}
                </button>
                {me.avatar && (
                  <button
                    onClick={() => void remove()}
                    disabled={busy}
                    className="btn-ghost !px-3 !py-1.5"
                  >
                    remove
                  </button>
                )}
              </div>
              {problem && (
                <p className="mt-1 text-sm text-[#fca5a5]">{problem}</p>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="btn-ghost self-start !px-3 !py-1.5 !text-lg leading-none"
            >
              ×
            </button>
          </header>

          <NicknameEditor me={me} onMe={onMe} />

          {/* the record */}
          <section aria-label="Your record">
            <h3 className="mb-2.5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-[#ffe29a] after:h-px after:flex-1 after:bg-gradient-to-r after:from-[#f4b43d]/50 after:to-transparent after:content-['']">
              Record
            </h3>
            {stats === "error" ? (
              <p className="rounded-xl bg-white/10 px-4 py-3 text-[15px] text-slate-200">
                The record could not be loaded.
              </p>
            ) : stats === null ? (
              <div
                role="status"
                aria-label="Loading your record"
                className="flex flex-col gap-3"
              >
                <div className="grid grid-cols-4 gap-3">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-[86px] rounded-2xl" />
                  ))}
                </div>
                <Skeleton className="h-2.5 rounded-full" />
                <RowSkeletons count={4} className="h-[38px]" gap="gap-1.5" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <Tile label="Wins" value={stats.wins} tone="text-[#86efac]" />
                  <Tile
                    label="Losses"
                    value={stats.losses}
                    tone="text-[#fca5a5]"
                  />
                  <Tile
                    label="Draws"
                    value={stats.draws}
                    tone="text-slate-200"
                  />
                  <Tile
                    label="Win rate"
                    value={rate === null ? "–" : `${rate}%`}
                    tone="text-[#fde68a]"
                  />
                </div>
                {total > 0 && (
                  <div
                    className="mt-3 flex h-3 overflow-hidden rounded-full bg-white/10 shadow-inner shadow-black/40"
                    role="img"
                    aria-label={`${stats.wins} wins, ${stats.losses} losses, ${stats.draws} draws`}
                  >
                    <span
                      className="bg-emerald-400"
                      style={{ width: `${(stats.wins / total) * 100}%` }}
                    />
                    <span
                      className="bg-slate-400"
                      style={{ width: `${(stats.draws / total) * 100}%` }}
                    />
                    <span
                      className="bg-rose-400"
                      style={{ width: `${(stats.losses / total) * 100}%` }}
                    />
                  </div>
                )}
                {stats.recent.length > 0 ? (
                  <ul className="mt-3 flex flex-col gap-1.5">
                    {stats.recent.map((m) => (
                      <li
                        key={m.id}
                        className="deck-row !flex-nowrap !gap-3 !py-2 text-[15px]" style={{ "--accent": m.result === "win" ? "#34d399" : m.result === "loss" ? "#fb7185" : "#94a3b8" } as React.CSSProperties}
                      >
                        <span
                          className={`chip w-16 justify-center ${m.result === "win" ? "chip-ok" : m.result === "loss" ? "!border-rose-400/40 !bg-rose-400/15 !text-[#fecdd3]" : "chip-meta"}`}
                        >
                          {m.result === "win"
                            ? "Win"
                            : m.result === "loss"
                              ? "Loss"
                              : "Draw"}
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          vs {m.opponent}
                        </span>
                        <span className="text-sm text-slate-300">
                          {m.turns ? `${m.turns} turns · ` : ""}
                          {new Date(m.playedAt).toLocaleDateString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-300">
                    No finished matches yet. Games against the bot are not
                    counted.
                  </p>
                )}
              </>
            )}
          </section>

          {/* the decks */}
          <section aria-label="Your decks">
            <div className="mb-2 flex items-center gap-3">
              <h3 className="flex flex-1 items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-[#ffe29a] after:h-px after:flex-1 after:bg-gradient-to-r after:from-[#f4b43d]/50 after:to-transparent after:content-['']">
                Saved decks
              </h3>
              <Link
                href="/decks"
                className="btn-ghost ml-auto"
              >
                Manage decks
              </Link>
              <Link
                href="/decks/new"
                className="btn-gold"
              >
                New deck
              </Link>
            </div>
            {decks === "error" ? (
              <p className="rounded-xl bg-white/10 px-4 py-3 text-[15px] text-slate-200">
                The decks could not be loaded.
              </p>
            ) : decks === null ? (
              <RowSkeletons
                count={3}
                className="h-[42px]"
                gap="gap-1.5"
                label="Loading your decks"
              />
            ) : decks.length === 0 ? (
              <p className="rounded-xl bg-white/10 px-4 py-3 text-[15px] text-slate-200">
                No saved decks yet. Build one, or copy an official deck from the
                Decks page.
              </p>
            ) : (
              <ul className="flex max-h-56 flex-col gap-1.5 overflow-y-auto pr-0.5">
                {decks.map((d) => (
                  <li key={d.id}>
                    <button
                      onClick={() => setViewing(d)}
                      {...onIntent(() => void loadDeckPreview(d.id).catch(() => undefined))}
                      className="deck-row w-full !flex-nowrap !gap-3 !py-2.5 text-left"
                      style={{ "--accent": d.ready ? "#34d399" : "#f4b43d" } as React.CSSProperties}
                    >
                      <span className="deck-name min-w-0 flex-1 truncate !text-[15px]">
                        {d.name}
                      </span>
                      <span className="text-sm text-slate-300">
                        {d.cards} cards
                      </span>
                      <span
                        className={`chip ${d.ready ? "chip-ok" : "chip-warn"}`}
                      >
                        {d.ready
                          ? "Ready to play"
                          : `${d.problems} problem${d.problems === 1 ? "" : "s"}`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
      {viewing && (
        <DeckPreview
          deck={viewing}
          editHref={`/decks/${viewing.id}`}
          layer="z-[45]"
          onClose={() => setViewing(null)}
        />
      )}
    </>
  );
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-gradient-to-b from-white/[0.12] to-white/[0.03] px-2 py-4 shadow-lg shadow-black/20">
      <div className={`font-title text-4xl font-extrabold tabular-nums ${tone}`}>
        {value}
      </div>
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">
        {label}
      </div>
    </div>
  );
}

/** Choose the name friends and opponents see. The login name never changes. */
function NicknameEditor({ me, onMe }: { me: Me; onMe: (m: Me) => void }) {
  const [text, setText] = useState(me.nickname ?? "");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; bad?: boolean } | null>(null);
  const changed = cleanNickname(text) !== me.nickname;

  async function save(value: string) {
    setBusy(true);
    setNote(null);
    try {
      const kept = await saveNickname(me.id, value);
      setText(kept ?? "");
      onMe({ ...me, nickname: kept });
      setNote({ text: kept ? "Saved. Friends and opponents now see this name." : "Nickname removed. Your login name is shown again." });
    } catch (e) {
      setNote({ text: e instanceof Error ? e.message : "Could not save the nickname.", bad: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Nickname">
      <h3 className="mb-2.5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-[#ffe29a] after:h-px after:flex-1 after:bg-gradient-to-r after:from-[#f4b43d]/50 after:to-transparent after:content-['']">Nickname</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (changed) void save(text);
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <label className="tool-field min-w-[12rem] flex-1">
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={MAX_NICKNAME} placeholder={me.name} aria-label="Nickname" autoComplete="off" className="w-full" />
        </label>
        <button type="submit" disabled={busy || !changed} className="btn-gold !py-2">
          {busy ? "Saving…" : "Save"}
        </button>
        {me.nickname && (
          <button type="button" disabled={busy} onClick={() => void save("")} className="btn-ghost !py-2">
            Reset
          </button>
        )}
      </form>
      <p className={`mt-1.5 text-sm ${note?.bad ? "text-[#fca5a5]" : "text-slate-300"}`}>
        {note?.text ?? `Shown to friends and opponents instead of @${me.name}. Your login name stays the same.`}
      </p>
    </section>
  );
}
