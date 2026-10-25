"use client";

import { useEffect } from "react";

/** Starts the service worker (public/sw.js) that keeps card pictures and the card catalogue on this device. Built app only: in `next dev` it would serve stale files. */
export default function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
