"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/billing/pricing";

type Status =
  | "COMPLIMENTARY"
  | "ACTIVE_MONTHLY"
  | "ACTIVE_ANNUAL"
  | "PAYMENT_ISSUE"
  | "CANCELLED"
  | "EXPIRED"
  | "SPONSORED"
  | "ADMIN_GRANTED";

interface BillingActionsProps {
  businessId: string;
  status: Status;
  hasStripeCustomer: boolean;
  monthlyPriceCents: number;
  annualPriceCents: number;
}

const NEEDS_A_PLAN: Status[] = ["COMPLIMENTARY", "EXPIRED"];

export function BillingActions({
  businessId,
  status,
  hasStripeCustomer,
  monthlyPriceCents,
  annualPriceCents,
}: BillingActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function post(url: string, body: object): Promise<{ ok: boolean; data: Record<string, unknown> }> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, data };
  }

  async function startCheckout(plan: "MONTHLY" | "ANNUAL") {
    setBusy(`checkout-${plan}`);
    setError(null);
    const { ok, data } = await post("/api/billing/checkout", { businessId, plan });
    setBusy(null);
    if (!ok) return setError((data.error as string) ?? "Something went wrong.");
    window.location.href = data.url as string;
  }

  async function openPortal() {
    setBusy("portal");
    setError(null);
    const { ok, data } = await post("/api/billing/portal", { businessId });
    setBusy(null);
    if (!ok) return setError((data.error as string) ?? "Something went wrong.");
    window.location.href = data.url as string;
  }

  async function cancel() {
    setBusy("cancel");
    setError(null);
    const { ok, data } = await post("/api/billing/cancel", { businessId });
    setBusy(null);
    if (!ok) return setError((data.error as string) ?? "Something went wrong.");
    router.refresh();
  }

  async function reactivate() {
    setBusy("reactivate");
    setError(null);
    const { ok, data } = await post("/api/billing/reactivate", { businessId });
    setBusy(null);
    if (!ok) return setError((data.error as string) ?? "Something went wrong.");
    if (data.mode === "checkout") {
      window.location.href = data.url as string;
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-5 flex flex-col gap-3 border-t border-navy-100 pt-4">
      {error && <Alert variant="danger">{error}</Alert>}

      {NEEDS_A_PLAN.includes(status) && (
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={() => startCheckout("MONTHLY")} disabled={busy !== null}>
            {busy === "checkout-MONTHLY" ? "Redirecting…" : `Monthly — ${formatCents(monthlyPriceCents)}/mo`}
          </Button>
          <Button size="sm" variant="gold" onClick={() => startCheckout("ANNUAL")} disabled={busy !== null}>
            {busy === "checkout-ANNUAL" ? "Redirecting…" : `Annual — ${formatCents(annualPriceCents)}/yr`}
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {hasStripeCustomer && (
          <Button size="sm" variant="outline" onClick={openPortal} disabled={busy !== null}>
            {busy === "portal" ? "Opening…" : "Update Payment"}
          </Button>
        )}

        {(status === "ACTIVE_MONTHLY" || status === "ACTIVE_ANNUAL") && (
          <>
            <Button size="sm" variant="outline" onClick={openPortal} disabled={busy !== null}>
              Change Plan
            </Button>
            <Button size="sm" variant="ghost" onClick={cancel} disabled={busy !== null}>
              {busy === "cancel" ? "Cancelling…" : "Cancel"}
            </Button>
          </>
        )}

        {status === "CANCELLED" && (
          <Button size="sm" variant="gold" onClick={reactivate} disabled={busy !== null}>
            {busy === "reactivate" ? "Reactivating…" : "Reactivate"}
          </Button>
        )}
      </div>
    </div>
  );
}
