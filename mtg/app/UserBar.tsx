"use client";

import Logo from "./Logo";
import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { animationsEnabled, setAnimationsEnabled } from "@/lib/motion";
import { connectSocial, disconnectSocial } from "@/lib/online/session";
import { clearCached } from "@/lib/dashCache";
import { setTheme } from "@/lib/theme";
import AudioMenu from "./AudioMenu";
import type { Theme } from "@/lib/theme";

/** Slim top bar shown only while signed in. */
export default function UserBar() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [animations, setAnimations] = useState(animationsEnabled);
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
      // signed in: friends can see this player is online, on whatever page they are
      if (session) void connectSocial();
      else {
        disconnectSocial();
        clearCached(); // the next person on this computer must not see this player's name
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!username) return null;

  async function signOut() {
    clearCached();
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="topbar">
      <Link href="/" className="flex items-center gap-2" aria-label="DuelRealm MTG home">
        <Logo size={26} />
        <span className="brand hidden min-[480px]:inline">DUELREALM</span>
      </Link>
      <span className="flex-1" />
      <button
        onClick={() => {
          setAnimationsEnabled(!animations);
          setAnimations(!animations);
        }}
        aria-pressed={animations}
        title="Turn attack, confetti and other animations on or off"
        className="bar-btn"
      >
        Animations: <span className={animations ? "font-semibold text-[#6ee7b7]" : "font-semibold text-slate-400"}>{animations ? "On" : "Off"}</span>
      </button>
      <AudioMenu />
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-pressed={theme === "dark"}
        title="Switch between light and dark mode"
        className="bar-btn"
      >
        {theme === "dark" ? "☀ Light" : "☾ Dark"}
      </button>
      <span className="hidden sm:inline">
        Signed in as <span className="font-semibold text-white">{username}</span>
      </span>
      <button onClick={signOut} className="bar-btn">
        Sign out
      </button>
    </div>
  );
}
