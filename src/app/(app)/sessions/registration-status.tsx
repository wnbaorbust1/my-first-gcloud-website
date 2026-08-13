"use client";

import { CheckCircle2, Clock, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatCents } from "@/lib/money";

interface RegistrationStatusProps {
  registrationId: string;
  status: "REGISTERED" | "WAITLISTED";
  waitlistPosition: number | null;
  /** null/0 = this session doesn't require payment. */
  priceCents: number | null;
  paidAt: string | null;
}

/** Shown instead of the Register button once the member has a registration. */
export function RegistrationStatus({
  registrationId,
  status,
  waitlistPosition,
  priceCents,
  paidAt,
}: RegistrationStatusProps) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    if (!confirm("Cancel this registration?")) return;
    setIsCancelling(true);
    await fetch(`/api/sessions/registrations/${registrationId}/cancel`, { method: "POST" });
    setIsCancelling(false);
    router.refresh();
  }

  async function handlePay() {
    setError(null);
    setIsStartingCheckout(true);
    const res = await fetch(`/api/sessions/registrations/${registrationId}/checkout`, {
      method: "POST",
    });
    const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
    if (!res.ok || !data?.url) {
      setIsStartingCheckout(false);
      setError(data?.error ?? "Couldn't start checkout.");
      return;
    }
    window.location.href = data.url;
  }

  const needsPayment = status === "REGISTERED" && Boolean(priceCents) && !paidAt;

  return (
    <div className="flex flex-col items-stretch gap-1.5">
      <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-success-bg px-3 py-2 text-sm font-medium text-success">
        {status === "REGISTERED" ? (
          <>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            You&apos;re Registered
          </>
        ) : (
          <>
            <Clock className="h-4 w-4" aria-hidden="true" />
            Waitlisted{waitlistPosition ? ` (#${waitlistPosition})` : ""}
          </>
        )}
      </span>

      {needsPayment && (
        <button
          type="button"
          onClick={handlePay}
          disabled={isStartingCheckout}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-gold-400 px-3 py-2 text-sm font-semibold text-navy-900 hover:bg-gold-300 disabled:opacity-60"
        >
          <CreditCard className="h-4 w-4" aria-hidden="true" />
          {isStartingCheckout ? "Redirecting…" : `Pay ${formatCents(priceCents!)} to Confirm`}
        </button>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
      {priceCents !== null && priceCents > 0 && paidAt && (
        <p className="text-center text-xs font-medium text-success">
          ✓ Paid {formatCents(priceCents)}
        </p>
      )}

      <button
        type="button"
        onClick={handleCancel}
        disabled={isCancelling}
        className="text-xs font-medium text-navy-400 underline hover:text-navy-700"
      >
        {isCancelling ? "Cancelling…" : "Cancel"}
      </button>
    </div>
  );
}
