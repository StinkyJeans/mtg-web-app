"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LiveWallpaper from "../LiveWallpaper";
import { createClient } from "@/lib/supabase/client";
import {
  MAX_PASSWORD_LENGTH,
  MAX_USERNAME_LENGTH,
  MIN_PASSWORD_LENGTH,
  MIN_USERNAME_LENGTH,
  normalizeUsername,
  usernameToEmail,
} from "@/lib/auth";

const REQUEST_LIMIT_MS = 20_000;

/** A request that never answers (a dropped connection, a stuck server) must not leave the form on "Please wait…" for good. */
function withLimit<T>(work: PromiseLike<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), REQUEST_LIMIT_MS);
    Promise.resolve(work).then(
      (v) => (clearTimeout(timer), resolve(v)),
      (e) => (clearTimeout(timer), reject(e)),
    );
  });
}

export default function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = normalizeUsername(username);
    if (name.length < MIN_USERNAME_LENGTH) {
      setError("Enter a username.");
      return;
    }
    if (name.length > MAX_USERNAME_LENGTH) {
      setError(`Username can be at most ${MAX_USERNAME_LENGTH} characters.`);
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError("Enter a password.");
      return;
    }
    if (password.length > MAX_PASSWORD_LENGTH) {
      setError(`Password can be at most ${MAX_PASSWORD_LENGTH} characters.`);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await attempt(name);
    } catch {
      setError("The server did not answer in time. Check your connection and try again.");
      setBusy(false);
    }
  }

  async function attempt(name: string) {
    const supabase = createClient();
    const email = usernameToEmail(name);

    if (mode === "login") {
      // signing in goes through our own route, which counts wrong passwords (5 wrong tries lock the account for 10 minutes)
      const res = await withLimit(
        fetch("/api/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ username: name, password }),
        }),
      ).catch(() => null);
      const body = (await res?.json().catch(() => null)) as { access_token?: string; refresh_token?: string; error?: string } | null;
      if (!res || !res.ok || !body?.access_token || !body.refresh_token) {
        setError(body?.error ?? "Could not reach the server. Try again.");
        setBusy(false);
        return;
      }
      const { error } = await withLimit(supabase.auth.setSession({ access_token: body.access_token, refresh_token: body.refresh_token }));
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
    } else {
      const { data, error } = await withLimit(supabase.auth.signUp({ email, password, options: { data: { username: name } } }));
      if (error) {
        setError(error.message.includes("already registered") ? "That username is taken." : error.message);
        setBusy(false);
        return;
      }
      if (!data.session) {
        setError('Account created but not signed in: turn OFF "Confirm email" in Supabase (Authentication → Sign In / Providers → Email).');
        setBusy(false);
        return;
      }
    }

    router.replace("/");
    router.refresh();
    // signed in, but the next page is slow to open: let the button come back rather than hang
    setTimeout(() => setBusy(false), REQUEST_LIMIT_MS);
  }

  const signup = mode === "signup";

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-x-clip p-5 text-white sm:p-8">
      <LiveWallpaper />
      <div className="relative flex w-full max-w-md flex-col items-center gap-7">
        <div className="hero-scrim" aria-hidden="true" />
        <div className="relative flex flex-col items-center gap-2 text-center">
          <p className="hero-eyebrow hero-rise">A two-player card duel game</p>
          <h1 className="hero-rise flex flex-col items-center gap-2 font-title" style={{ animationDelay: "0.06s" }}>
            <span className="hero-title" style={{ fontSize: "clamp(2.2rem, 9vw, 3.4rem)" }}>DuelRealm</span>
            <span className="hero-mtg">MTG</span>
          </h1>
        </div>

        <form onSubmit={submit} className="panel-glass hero-rise relative flex w-full flex-col gap-5 p-6 sm:p-7" style={{ animationDelay: "0.16s" }}>
          <div className="flex flex-col gap-1">
            <h2 className="font-title text-xl font-extrabold uppercase tracking-[0.16em] text-[#ffe29a]">{signup ? "Create account" : "Welcome back"}</h2>
            <p className="text-sm text-slate-300">{signup ? "Pick a username and a password to start dueling." : "Log in to build decks and join a match."}</p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="field-label">Username</span>
            <input className="auth-input" maxLength={MAX_USERNAME_LENGTH} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="field-label">Password</span>
            <input
              className="auth-input"
              type="password"
              maxLength={MAX_PASSWORD_LENGTH}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={signup ? "new-password" : "current-password"}
            />
          </label>

          {error && (
            <p role="alert" className="rounded-lg border border-red-400/40 bg-red-500/15 px-3 py-2 text-sm text-[#fecaca]">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy} className="btn-gold w-full justify-center py-2.5">
            {busy ? "Please wait…" : signup ? "Create account" : "Log in"}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(signup ? "login" : "signup");
              setError(null);
            }}
            className="text-sm text-slate-300 underline-offset-4 hover:text-[#ffe29a] hover:underline"
          >
            {signup ? "Already have an account? Log in" : "No account yet? Create one"}
          </button>
        </form>
      </div>
    </main>
  );
}
