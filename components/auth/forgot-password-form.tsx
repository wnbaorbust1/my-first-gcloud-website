"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { requestPasswordResetAction } from "@/lib/auth/actions";
import { initialAuthActionState } from "@/lib/auth/types";
import { FormField } from "@/components/auth/form-field";
import { SubmitButton } from "@/components/auth/submit-button";

export function ForgotPasswordForm() {
  const [state, formAction] = useFormState(requestPasswordResetAction, initialAuthActionState);

  if (state.success) {
    return (
      <div className="space-y-4">
        <div className="border border-gold-leaf/50 bg-gold-leaf/10 p-5">
          <p className="text-sm text-ink">{state.message}</p>
        </div>
        <p className="text-center text-sm text-slate">
          <Link href="/login" className="text-ink underline underline-offset-2">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4" noValidate>
        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          error={state.fieldErrors?.email?.[0]}
        />

        {state.error && (
          <p role="alert" className="text-sm text-rose-gold">
            {state.error}
          </p>
        )}

        <SubmitButton pendingLabel="Sending…">Send reset link</SubmitButton>
      </form>

      <p className="text-center text-sm text-slate">
        <Link href="/login" className="text-ink underline underline-offset-2">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
