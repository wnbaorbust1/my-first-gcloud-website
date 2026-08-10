import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/session";

import { ReturnRedirect } from "./return-redirect";

export const metadata: Metadata = { title: "Confirming — Blueprint" };
export const dynamic = "force-dynamic";

/** Stripe Checkout's success_url lands here — a brief "confirming" beat while the webhook updates Membership, then on to the real Billing page. */
export default async function BillingReturnPage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-md">
      <Card className="text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-success" aria-hidden="true" />
        <p className="mt-3 text-lg font-semibold text-navy-900">Thanks! Confirming your subscription…</p>
        <p className="mt-1 text-sm text-foreground-muted">
          This only takes a moment — taking you to your Billing page.
        </p>
      </Card>
      <ReturnRedirect />
    </div>
  );
}
