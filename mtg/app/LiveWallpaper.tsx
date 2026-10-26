"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { animationsEnabled } from "@/lib/motion";

// The moving background of a page (the home page and the Decks page).
//   1. If you put your own file in  mtg/public/backgrounds/  named  home.mp4  or  home.webm  (a video), or  home.gif / home.webp /
//      home.png / home.jpg  (a picture), that plays behind the page.
//   2. Otherwise the page is just a plain dark background.
// The "Animations" switch in the top bar freezes it either way. It is all CSS (plus your file), so it costs almost nothing.

const PICTURE_TYPES = ["gif", "webp", "png", "jpg"];

let holds = 0;
/** Freeze every wallpaper until the returned function is called. */
export function holdWallpaper() {
  holds++;
  window.dispatchEvent(new Event("mtg-wallpaper-hold"));
  return () => {
    holds--;
    window.dispatchEvent(new Event("mtg-wallpaper-hold"));
  };
}

function subscribe(callback: () => void) {
  window.addEventListener("mtg-animations", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("mtg-animations", callback);
    window.removeEventListener("storage", callback);
  };
}

/** `name` picks the file: "home" plays home.mp4 / home.webm (or a picture), "decks" plays decks.mp4, and so on. */
export default function LiveWallpaper({ name = "home" }: { name?: string }) {
  const PICTURES = PICTURE_TYPES.map((type) => `/backgrounds/${name}.${type}`);
  const running = useSyncExternalStore(subscribe, animationsEnabled, () => true);
  // Your file is only added once the page is running in the browser: an image that finished loading before the page woke up would never report it.
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  // A pop-up with a blurred glass panel asks the wallpaper to hold still (blurring a frozen frame is far cheaper than a moving one).
  const held = useSyncExternalStore(
    (callback) => {
      window.addEventListener("mtg-wallpaper-hold", callback);
      return () => window.removeEventListener("mtg-wallpaper-hold", callback);
    },
    () => holds > 0,
    () => false,
  );
  const video = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false); // neither video file exists: only then are pictures looked for
  const [picture, setPicture] = useState(0); // which picture name is being tried
  const [pictureReady, setPictureReady] = useState(false);

  // The switch in the top bar also pauses your video.
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (running && !held) void el.play().catch(() => undefined);
    else el.pause();
  }, [running, held, videoReady]);

  // No point decoding frames nobody can see.
  useEffect(() => {
    const onVisible = () => {
      const el = video.current;
      if (!el) return;
      if (document.hidden || !running || held) el.pause();
      else void el.play().catch(() => undefined);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [running, held]);

  return (
    <div aria-hidden="true" className={`live-wallpaper ${running ? "" : "live-wallpaper-paused"}`}>
      {/* Your own file: it stays invisible until it has really loaded, so a missing file changes nothing */}
      {mounted && (
      <video
        ref={video}
        className={`live-custom ${videoReady ? "live-custom-on" : ""}`}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        disablePictureInPicture
        onLoadedData={() => setVideoReady(true)}
      >
        <source src={`/backgrounds/${name}.mp4`} type="video/mp4" />
        <source src={`/backgrounds/${name}.webm`} type="video/webm" onError={() => setVideoFailed(true)} />
      </video>
      )}
      {mounted && videoFailed && picture < PICTURES.length && !videoReady && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={PICTURES[picture]}
          alt=""
          className={`live-custom ${pictureReady ? "live-custom-on" : ""}`}
          onLoad={() => setPictureReady(true)}
          onError={() => setPicture((p) => p + 1)}
        />
      )}

    </div>
  );
}
