import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ANNUAL_PRICE_CENTS,
  ANNUAL_SAVINGS_PERCENT,
  MONTHLY_PRICE_CENTS,
  TRIAL_DAYS,
  formatCents,
} from "@/lib/billing/pricing";

export const metadata: Metadata = { title: "Pricing — Blueprint" };

const INCLUDED = [
  "Your full personalized Passion → Power → Legacy roadmap",
  "The Business Builder — every task, structured and guided",
  "My Blueprint, your living business book",
  "Blueprint AI, grounded in your real business",
  "Every Blueprint Session you register for",
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 pb-24 pt-16 sm:pt-24">
      <div className="text-center">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-gold-600">
          Blueprint Builder
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-navy-900 sm:text-5xl">
          First {TRIAL_DAYS} days free with a qualifying session
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-foreground-muted">
          Attend your Blueprint Session, and your free {TRIAL_DAYS} days starts the moment your
          Builder dashboard activates — not when you register.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Card className="flex flex-col">
          <p className="text-sm font-semibold uppercase tracking-wide text-navy-400">Monthly</p>
          <p className="mt-2 font-display text-4xl font-semibold text-navy-900">
            {formatCents(MONTHLY_PRICE_CENTS)}
            <span className="text-base font-normal text-foreground-muted">/month</span>
          </p>
          <p className="mt-2 text-sm text-foreground-muted">Cancel anytime.</p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/signup">Start My Free {TRIAL_DAYS} Days</Link>
          </Button>
        </Card>

        <Card className="flex flex-col border-gold-300 bg-gradient-to-br from-gold-50 to-surface">
          <p className="text-sm font-semibold uppercase tracking-wide text-gold-600">Annual</p>
          <p className="mt-2 font-display text-4xl font-semibold text-navy-900">
            {formatCents(ANNUAL_PRICE_CENTS)}
            <span className="text-base font-normal text-foreground-muted">/year</span>
          </p>
          <p className="mt-2 text-sm font-semibold text-gold-700">
            Save approximately {ANNUAL_SAVINGS_PERCENT}%
          </p>
          <Button asChild size="lg" variant="gold" className="mt-6">
            <Link href="/signup">Start My Free {TRIAL_DAYS} Days</Link>
          </Button>
        </Card>
      </div>

      <Card className="mt-10">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-400">
          Every plan includes
        </p>
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {INCLUDED.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-navy-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </Card>

      <p className="mt-8 text-center text-xs text-foreground-muted">
        The free {TRIAL_DAYS}-day period begins once your qualifying Blueprint Session attendance
        is confirmed and your Builder dashboard is activated. If you&apos;ve already attended a
        session and become a paying member, attending another session doesn&apos;t start a new
        trial.
      </p>
    </div>
  );
}
