"use client";

import { useFormState } from "react-dom";
import { createPortalSessionAction, type PortalActionState } from "@/lib/billing/portal-actions";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: PortalActionState = { error: null };

/** Sends the teacher to Stripe's hosted Customer Portal for plan changes, cancellation, and payment-method updates. */
export function ManageBillingButton() {
  const [state, formAction] = useFormState(createPortalSessionAction, initialState);

  return (
    <form action={formAction} className="mt-4">
      <SubmitButton pendingLabel="Redirecting…" className="w-auto px-4 py-2">
        Manage billing
      </SubmitButton>
      {state.error && (
        <p role="alert" className="mt-2 text-xs text-rose-gold">
          {state.error}
        </p>
      )}
    </form>
  );
}
