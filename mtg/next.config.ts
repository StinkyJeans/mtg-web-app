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
