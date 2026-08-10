"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { signUpAction } from "@/lib/auth/actions";
import { initialAuthActionState } from "@/lib/auth/types";
import { FormField } from "@/components/auth/form-field";
import { SubmitButton } from "@/components/auth/submit-button";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export function SignupForm() {
  const [state, formAction] = useFormState(signUpAction, initialAuthActionState);

  if (state.success) {
    return (
      <div className="border border-gold-leaf/50 bg-gold-leaf/10 p-5">
        <p className="text-sm text-ink">{state.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4" noValidate>
        <FormField
          label="Full name"
          name="name"
          type="text"
          autoComplete="name"
          required
          error={state.fieldErrors?.name?.[0]}
        />
        <FormField
          label="School (optional)"
          name="school"
          type="text"
          autoComplete="organization"
          error={state.fieldErrors?.school?.[0]}
        />
        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          error={state.fieldErrors?.email?.[0]}
        />
        <FormField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          error={state.fieldErrors?.password?.[0]}
        />

        {state.error && (
          <p role="alert" className="text-sm text-rose-gold">
            {state.error}
          </p>
        )}

        <SubmitButton pendingLabel="Creating account…">Create account</SubmitButton>
      </form>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate/30" />
        <span className="font-mono text-[11px] uppercase tracking-wide text-slate">or</span>
        <div className="h-px flex-1 bg-slate/30" />
      </div>

      <GoogleSignInButton />

      <p className="text-center text-sm text-slate">
        Already have an account?{" "}
        <Link href="/login" className="text-ink underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </div>
  );
}
