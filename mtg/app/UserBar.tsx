"use client";

import Logo from "./Logo";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { animationsEnabled, setAnimationsEnabled } from "@/lib/motion";
import { connectSocial, disconnectSocial } from "@/lib/online/session";
import { clearCached } from "@/lib/dashCache";
import AudioMenu from "./AudioMenu";

/** Slim top bar shown only while signed in. */
export default function UserBar() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [animations, setAnimations] = useState(animationsEnabled);
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
        <span className="brand">DUELREALM</span>
      </Link>
      <span className="flex-1" />
      <button
        onClick={() => {
          setAnimationsEnabled(!animations);
          setAnimations(!animations);
        }}
        aria-pressed={animations}
        title="Turn attack, confetti and other animations on or off"
        aria-label={`Animations: ${animations ? "on" : "off"}`}
        className="bar-btn"
      >
        <span className="min-[480px]:hidden" aria-hidden="true">✨ </span><span className="max-[479px]:hidden">Animations: </span><span className={animations ? "font-semibold text-[#6ee7b7]" : "font-semibold text-slate-400"}>{animations ? "On" : "Off"}</span>
      </button>
      <AudioMenu />
      <span className="hidden sm:inline">
        Signed in as <span className="font-semibold text-white">{username}</span>
      </span>
      <button onClick={signOut} className="bar-btn">
        Sign out
      </button>
    </div>
  );
}
