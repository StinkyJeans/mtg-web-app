"use client";

import { useEffect } from "react";
import { startMusic } from "@/lib/music";
import { audioContext } from "@/lib/sound";

/** Starts the audio on the first click or key press anywhere (browsers allow sound only after one), and with it the music. */
export default function Music() {
  useEffect(() => {
    const begin = () => {
      audioContext();
      startMusic();
    };
    window.addEventListener("pointerdown", begin, { once: true });
    window.addEventListener("keydown", begin, { once: true });
    return () => {
      window.removeEventListener("pointerdown", begin);
      window.removeEventListener("keydown", begin);
    };
  }, []);
  return null;
}
