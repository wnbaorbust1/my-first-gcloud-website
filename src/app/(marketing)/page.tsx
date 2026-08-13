import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { STAGES, STAGE_META } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Blueprint — From Passion to Power to Legacy™",
};

const STAGE_COPY: Record<(typeof STAGES)[number], string> = {
  PASSION: "Purpose, vision, clarity, and identity.",
  POWER: "Execution, systems, marketing, and momentum.",
  LEGACY: "Leadership, scale, ownership, and long-term wealth.",
};

export default function MarketingHomePage() {
  return (
    <div>
      <section className="mx-auto max-w-4xl px-6 pb-16 pt-20 text-center sm:pt-28">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-gold-600">
          The Business Growth OS
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-navy-900 sm:text-5xl">
          From Passion to Power to Legacy™
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-foreground-muted">
          Blueprint shows you exactly where your business stands today — and
          what to build next — with a personalized roadmap, coaching
          sessions, and tools built around your journey.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/signup">
              Start My Blueprint
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Log In</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {STAGES.map((stage) => {
            const meta = STAGE_META[stage];
            return (
              <Card key={stage} className="text-center">
                <span className="text-3xl" aria-hidden="true">
                  {meta.icon}
                </span>
                <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-navy-800">
                  {meta.label}
                </p>
                <p className="mt-1.5 text-sm text-foreground-muted">
                  {STAGE_COPY[stage]}
                </p>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
