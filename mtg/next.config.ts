import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Lets a check build (NEXT_BUILD_DIR=.next-check next build) use its own folder, so it can't clash with a running `next dev`.
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [
      {
        // The wallpapers are large (the videos are 6 to 11 MB). Keep them for a week; the browser may keep playing an old one for that long if a file is swapped under the same name.
        source: "/:folder(backgrounds|music)/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=2592000" }],
      },
      {
        // The service worker itself is always checked, so an update reaches everyone.
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
    ];
  },
  turbopack: {
    // Parent folder, so the linked engine package (../packages/engine/dist) can be resolved.
    root: path.join(__dirname, ".."),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
