"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  MAX_PASSWORD_LENGTH,
  MAX_USERNAME_LENGTH,
  MIN_PASSWORD_LENGTH,
  MIN_USERNAME_LENGTH,
  normalizeUsername,
  usernameToEmail,
} from "@/lib/auth";

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
    const supabase = createClient();
    const email = usernameToEmail(name);

    if (mode === "login") {
      // signing in goes through our own route, which counts wrong passwords (5 wrong tries lock the account for 10 minutes)
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: name, password }),
      }).catch(() => null);
      const body = (await res?.json().catch(() => null)) as { access_token?: string; refresh_token?: string; error?: string } | null;
      if (!res || !res.ok || !body?.access_token || !body.refresh_token) {
        setError(body?.error ?? "Could not reach the server. Try again.");
        setBusy(false);
        return;
      }
      const { error } = await supabase.auth.setSession({ access_token: body.access_token, refresh_token: body.refresh_token });
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username: name } } });
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
  }

  const input = "w-full rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 outline-none focus:border-amber-400";

  return (
    <main className="flex flex-1 items-center justify-center p-6 text-zinc-900">
      <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-zinc-200 bg-zinc-100/60 p-6">
        <h1 className="text-2xl font-bold">{mode === "login" ? "Log in" : "Create account"}</h1>

        <label className="flex flex-col gap-1 text-sm text-zinc-600">
          Username
          <input className={input} maxLength={MAX_USERNAME_LENGTH} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-600">
          Password
          <input
            className={input}
            type="password"
            maxLength={MAX_PASSWORD_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
        >
          {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
          }}
          className="text-sm text-zinc-600 underline hover:text-zinc-800"
        >
          {mode === "login" ? "No account yet? Create one" : "Already have an account? Log in"}
        </button>
      </form>
    </main>
  );
}
