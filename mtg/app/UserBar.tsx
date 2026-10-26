"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { animationsEnabled, setAnimationsEnabled } from "@/lib/motion";
import { playSound, setSoundEnabled, soundEnabled } from "@/lib/sound";
import { setTheme } from "@/lib/theme";
import type { Theme } from "@/lib/theme";

/** Slim top bar shown only while signed in. */
export default function UserBar() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [animations, setAnimations] = useState(animationsEnabled);
  const [sound, setSound] = useState(soundEnabled);
  // The page already carries its theme (set before it was drawn); this just follows it.
  const theme = useSyncExternalStore(
    (cb) => {
      window.addEventListener("mtg-theme", cb);
      return () => window.removeEventListener("mtg-theme", cb);
    },
    () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light") as Theme,
    () => "light" as Theme,
  );

  useEffect(() => {
    const { data } = createClient().auth.onAuthStateChange((_event, session) => {
      setUsername(session ? ((session.user.user_metadata.username as string | undefined) ?? "player") : null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!username) return null;

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex h-10 shrink-0 items-center justify-end gap-3 border-b border-white/15 bg-slate-950/45 px-4 text-sm text-slate-200 shadow-[0_1px_12px_rgba(0,0,0,0.25)]">
      <button
        onClick={() => {
          setAnimationsEnabled(!animations);
          setAnimations(!animations);
        }}
        aria-pressed={animations}
        title="Turn attack, confetti and other animations on or off"
        className="rounded-md border border-white/20 bg-white/10 px-2 py-1 transition hover:bg-white/20"
      >
        Animations: <span className={animations ? "font-semibold text-[#6ee7b7]" : "font-semibold text-slate-400"}>{animations ? "On" : "Off"}</span>
      </button>
      <button
        onClick={() => {
          setSoundEnabled(!sound);
          setSound(!sound);
          if (!sound) playSound("draw"); // a sample, so the player hears it is on
        }}
        aria-pressed={sound}
        title="Turn the game's sound effects on or off"
        className="rounded-md border border-white/20 bg-white/10 px-2 py-1 transition hover:bg-white/20"
      >
        Sound: <span className={sound ? "font-semibold text-[#6ee7b7]" : "font-semibold text-slate-400"}>{sound ? "On" : "Off"}</span>
      </button>
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-pressed={theme === "dark"}
        title="Switch between light and dark mode"
        className="rounded-md border border-white/20 bg-white/10 px-2 py-1 transition hover:bg-white/20"
      >
        {theme === "dark" ? "☀ Light" : "☾ Dark"}
      </button>
      <span>
        Signed in as <span className="font-semibold text-white">{username}</span>
      </span>
      <button onClick={signOut} className="rounded-md border border-white/20 bg-white/10 px-2 py-1 transition hover:bg-white/20">
        Sign out
      </button>
    </div>
  );
}
