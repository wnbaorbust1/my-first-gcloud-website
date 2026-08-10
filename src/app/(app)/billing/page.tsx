import { CreditCard } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { amountCentsFor, MEMBERSHIP_STATUS_LABELS } from "@/lib/billing/display";
import { getSyncedMembership } from "@/lib/billing/membership";
import { ANNUAL_PRICE_CENTS, MONTHLY_PRICE_CENTS, formatCents } from "@/lib/billing/pricing";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

import { BillingActions } from "./billing-actions";

export const metadata: Metadata = { title: "Billing — Blueprint" };
export const dynamic = "force-dynamic";

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export default async function BillingPage() {
  const user = await requireUser();

  const userBusinessMembership = await prisma.userBusinessMembership.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: { business: true },
  });

  if (!userBusinessMembership) {
    return (
      <EmptyState
        icon={CreditCard}
        title="Set up your business first"
        description="Billing activates once your business has attended a qualifying Blueprint Session."
        action={
          <Button asChild size="sm">
            <Link href="/business-profile">Create My Business Profile</Link>
          </Button>
        }
      />
    );
  }

  const businessId = userBusinessMembership.businessId;
  const membership = await getSyncedMembership(businessId);

  if (!membership) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-3xl font-semibold text-navy-900">Billing</h1>
        <Card className="mt-6">
          <p className="text-sm text-navy-800">
            Blueprint Builder is first {30} days free once you attend your qualifying Blueprint
            Session — then $9.99/month or $100/year. Nothing to bill yet.
          </p>
          <Button asChild size="sm" className="mt-4">
            <Link href="/sessions">View My Recommended Session</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const invoices = await prisma.membershipInvoice.findMany({
    where: { membershipId: membership.id },
    orderBy: { createdAt: "desc" },
  });

  const amountCents = amountCentsFor(membership.status, membership.plan);
  const planLabel = membership.plan === "ANNUAL" ? "Annual" : membership.plan === "MONTHLY" ? "Monthly" : "—";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-navy-900">Billing</h1>
      <p className="text-sm text-foreground-muted">{userBusinessMembership.business.name}</p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Plan</p>
            <p className="mt-0.5 font-medium text-navy-900">{planLabel}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Status</p>
            <p className="mt-0.5 font-medium text-navy-900">{MEMBERSHIP_STATUS_LABELS[membership.status]}</p>
          </div>
          {membership.status === "COMPLIMENTARY" && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Trial End</p>
              <p className="mt-0.5 font-medium text-navy-900">{formatDate(membership.trialEndsAt)}</p>
            </div>
          )}
          {(membership.status === "ACTIVE_MONTHLY" ||
            membership.status === "ACTIVE_ANNUAL" ||
            membership.status === "CANCELLED") && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                {membership.status === "CANCELLED" ? "Access Through" : "Next Billing Date"}
              </p>
              <p className="mt-0.5 font-medium text-navy-900">{formatDate(membership.currentPeriodEndsAt)}</p>
            </div>
          )}
          {amountCents !== null && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Amount</p>
              <p className="mt-0.5 font-medium text-navy-900">
                {formatCents(amountCents)}
                {membership.status === "ACTIVE_ANNUAL" ? "/year" : "/month"}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Payment Method</p>
            <p className="mt-0.5 font-medium text-navy-900">
              {membership.paymentMethodBrand && membership.paymentMethodLast4
                ? `${membership.paymentMethodBrand.toUpperCase()} •••• ${membership.paymentMethodLast4} (exp ${membership.paymentMethodExpMonth}/${membership.paymentMethodExpYear})`
                : "Not on file"}
            </p>
          </div>
        </div>

        {membership.status === "PAYMENT_ISSUE" && (
          <p className="mt-4 rounded-xl bg-danger-bg px-4 py-3 text-sm text-danger">
            Your last payment didn&apos;t go through. Update your payment method below to keep your
            Blueprint Builder access.
          </p>
        )}

        <BillingActions
          businessId={businessId}
          status={membership.status}
          hasStripeCustomer={Boolean(membership.stripeCustomerId)}
          monthlyPriceCents={MONTHLY_PRICE_CENTS}
          annualPriceCents={ANNUAL_PRICE_CENTS}
        />
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        {invoices.length === 0 ? (
          <p className="text-sm text-foreground-muted">No payments yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-navy-50 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-navy-900">{formatCents(inv.amountCents)}</p>
                  <p className="text-xs text-foreground-muted">{formatDate(inv.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={
                      inv.status === "PAID"
                        ? "text-xs font-semibold uppercase tracking-wide text-success"
                        : inv.status === "FAILED"
                          ? "text-xs font-semibold uppercase tracking-wide text-danger"
                          : "text-xs font-semibold uppercase tracking-wide text-navy-400"
                    }
                  >
                    {inv.status}
                  </span>
                  {inv.receiptUrl && (
                    <a
                      href={inv.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-navy-500 underline hover:text-navy-800"
                    >
                      Receipt
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
