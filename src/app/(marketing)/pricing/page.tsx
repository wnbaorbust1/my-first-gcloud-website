import { Calendar, CheckCircle2, MapPin } from "lucide-react";
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
import { getUpcomingSessions } from "@/lib/sessions/queries";
import { SESSION_TYPE_DISPLAY } from "@/app/(app)/assessment/results/session-type-display";

export const metadata: Metadata = { title: "Pricing — Blueprint" };
// Real, live session dates/prices below — never statically baked at build
// time (a visitor six weeks from now must see real upcoming sessions, not
// whatever was scheduled when this last deployed).
export const dynamic = "force-dynamic";

const INCLUDED = [
  "Your full personalized Passion → Power → Legacy roadmap",
  "The Business Builder — every task, structured and guided",
  "My Blueprint, your living business book",
  "Blueprint AI, grounded in your real business",
  "Every Blueprint Session you register for",
];

function formatSessionDates(startsAt: Date, endsAt: Date | null, timezone: string) {
  const startStr = startsAt.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    timeZone: timezone,
  });
  const year = startsAt.toLocaleDateString(undefined, { year: "numeric", timeZone: timezone });

  // Compare calendar days *in the session's own timezone*, not the
  // server's — a single-day session (same startsAt/endsAt date) must
  // read as one date, not "September 10-10, 2026".
  if (
    !endsAt ||
    startsAt.toLocaleDateString(undefined, { timeZone: timezone }) ===
      endsAt.toLocaleDateString(undefined, { timeZone: timezone })
  ) {
    return `${startStr}, ${year}`;
  }

  const sameMonth =
    startsAt.toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: timezone }) ===
    endsAt.toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: timezone });
  const endStr = endsAt.toLocaleDateString(undefined, {
    month: sameMonth ? undefined : "long",
    day: "numeric",
    timeZone: timezone,
  });
  const endYear = endsAt.toLocaleDateString(undefined, { year: "numeric", timeZone: timezone });
  return `${startStr}–${endStr}, ${endYear}`;
}

export default async function PricingPage() {
  // Public, pre-signup page — deliberately the same fields already shown
  // to signed-in members on /sessions (title, dates, location, price),
  // never virtualLink or anything registrant-specific, since anyone on
  // the internet can load this page.
  // This public page promotes a single entry point for new visitors:
  // the Passion Session (the recommended first session for anyone new
  // to Blueprint, and the only one the current marketing push is
  // driving traffic to). The other weekly-rotating types (Power,
  // Legacy, Growth) exist for members already inside the app who've
  // been recommended one of those specifically — not shown here.
  const upcomingSessions = await getUpcomingSessions("PASSION");

  return (
    <div className="mx-auto max-w-4xl px-6 pb-24 pt-16 sm:pt-24">
      <div className="text-center">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-gold-600">
          Blueprint Sessions
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-navy-900 sm:text-5xl">
          Start with a real, in-person session
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-foreground-muted">
          Every Blueprint journey starts here — clarity, strategy, and your next concrete step,
          guided in person.
        </p>
      </div>

      <div className="mt-10 flex flex-col gap-4">
        {upcomingSessions.length === 0 ? (
          <Card className="text-center text-sm text-foreground-muted">
            No sessions are open for registration right now — sign up free and we&apos;ll let you
            know the moment one is.
          </Card>
        ) : (
          upcomingSessions.map((session) => {
            const typeMeta = SESSION_TYPE_DISPLAY[session.sessionType];
            return (
              <Card key={session.id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${typeMeta.badgeClasses}`}
                  >
                    <span aria-hidden="true">{typeMeta.icon}</span> {typeMeta.label} Session
                  </p>
                  <p className="mt-2 font-display text-xl font-semibold text-navy-900">{session.title}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-foreground-muted">
                    <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {formatSessionDates(session.startsAt, session.endsAt, session.timezone)}
                  </p>
                  {session.location && (
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-foreground-muted">
                      <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {session.location}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                  <p className="font-display text-2xl font-semibold text-navy-900">
                    {session.priceCents ? formatCents(session.priceCents) : "Free"}
                  </p>
                  <Button asChild>
                    <Link href="/signup">Sign Up Free to Register</Link>
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <div className="mt-16 text-center">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-gold-600">
          Blueprint Builder
        </p>
        <h2 className="font-display text-3xl font-semibold tracking-tight text-navy-900 sm:text-4xl">
          First {TRIAL_DAYS} days free with a qualifying session
        </h2>
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
