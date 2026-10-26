"use client";

import { useEffect, useRef } from "react";
import { setMusicActive, setMusicBlocked, useMusic } from "@/lib/music";

/**
 * The dashboard's background music (public/music/dashboard.mp3), looping. It exists only while the dashboard is open, so it
 * stops when you go anywhere else. Browsers don't allow sound before the player has clicked something: if that happens, the
 * music starts with the first click or key press. The top bar's control sets the volume and the mute switch.
 */
export default function BackgroundMusic() {
  const audio = useRef<HTMLAudioElement>(null);
  const { volume, muted } = useMusic();

  useEffect(() => {
    setMusicActive(true);
    return () => setMusicActive(false);
  }, []);

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    a.volume = volume;
    a.muted = muted;
  }, [volume, muted]);

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const events = ["pointerdown", "keydown"] as const;
    const cleanup = () => events.forEach((e) => window.removeEventListener(e, start));
    function start() {
      if (document.hidden) return;
      void a!.play().then(
        () => {
          setMusicBlocked(false);
          cleanup();
        },
        () => setMusicBlocked(true), // not allowed yet: wait for a click
      );
    }
    // a hidden tab stays quiet; coming back resumes it
    const onVisible = () => (document.hidden ? a.pause() : start());
    document.addEventListener("visibilitychange", onVisible);
    events.forEach((e) => window.addEventListener(e, start));
    start();
    return () => {
      cleanup();
      document.removeEventListener("visibilitychange", onVisible);
      a.pause();
      setMusicBlocked(false);
    };
  }, []);

  return <audio ref={audio} src="/music/dashboard.mp3" loop preload="auto" aria-hidden="true" />;
}
