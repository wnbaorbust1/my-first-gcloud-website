"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * OAuth has to be initiated client-side (it performs a browser redirect to
 * Google via Supabase's authorize URL) — unlike the other auth flows here,
 * this can't be a Server Action. Rate limiting doesn't apply the same way:
 * there's no password to guess, and Google fronts its own abuse
 * protection on the consent screen.
 */
export function GoogleSignInButton({ next }: { next?: string }) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    const supabase = createClient();
    const redirectTo = new URL("/auth/callback", window.location.origin);
    redirectTo.searchParams.set("next", next && next.startsWith("/") ? next : "/dashboard");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo.toString() },
    });

    if (error) {
      setPending(false);
      console.error("Google sign-in failed", error);
    }
    // On success the browser is redirected away by Supabase before this
    // resolves further — no need to reset `pending`.
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 border border-slate/40 bg-cream px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-rose-gold/10 disabled:opacity-60"
    >
      <svg viewBox="0 0 18 18" width="16" height="16" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z"
        />
        <path
          fill="#34A853"
          d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.9v2.33A9 9 0 0 0 9 18Z"
        />
        <path
          fill="#FBBC05"
          d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.03l3.05-2.33Z"
        />
        <path
          fill="#EA4335"
          d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 4.97l3.05 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
        />
      </svg>
      {pending ? "Redirecting…" : "Continue with Google"}
    </button>
  );
}
