import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Skip static assets, image files, the service worker and the wallpapers (public files that need no login check).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw\\.js$|backgrounds/|music/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
