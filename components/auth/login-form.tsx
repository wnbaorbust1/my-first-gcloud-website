"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { signInAction } from "@/lib/auth/actions";
import { initialAuthActionState } from "@/lib/auth/types";
import { FormField } from "@/components/auth/form-field";
import { SubmitButton } from "@/components/auth/submit-button";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useFormState(signInAction, initialAuthActionState);

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4" noValidate>
        {next && <input type="hidden" name="next" value={next} />}

        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          error={state.fieldErrors?.email?.[0]}
        />

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-ink">
              Password
            </label>
            <Link href="/forgot-password" className="text-xs text-rose-gold hover:underline">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full border border-slate/40 bg-cream px-3 py-2 text-sm text-ink"
          />
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-rose-gold">
            {state.error}
          </p>
        )}

        <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
      </form>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate/30" />
        <span className="font-mono text-[11px] uppercase tracking-wide text-slate">or</span>
        <div className="h-px flex-1 bg-slate/30" />
      </div>

      <GoogleSignInButton next={next} />

      <p className="text-center text-sm text-slate">
        New here?{" "}
        <Link href="/signup" className="text-ink underline underline-offset-2">
          Create an account
        </Link>
      </p>
    </div>
  );
}
