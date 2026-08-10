"use client";

import { useFormState } from "react-dom";
import { updatePasswordAction } from "@/lib/auth/actions";
import { initialAuthActionState } from "@/lib/auth/types";
import { FormField } from "@/components/auth/form-field";
import { SubmitButton } from "@/components/auth/submit-button";

export function ResetPasswordForm() {
  const [state, formAction] = useFormState(updatePasswordAction, initialAuthActionState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormField
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.password?.[0]}
      />
      <FormField
        label="Confirm new password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.confirmPassword?.[0]}
      />

      {state.error && (
        <p role="alert" className="text-sm text-rose-gold">
          {state.error}
        </p>
      )}

      <SubmitButton pendingLabel="Updating…">Update password</SubmitButton>
    </form>
  );
}
