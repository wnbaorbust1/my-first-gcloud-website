"use client";

import { Bot, Compass, Sparkles, Trophy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

const POINTS = [
  {
    icon: Compass,
    title: "Your Next Best Move",
    body: "Right at the top of this page, every day — the one thing worth doing next, and why.",
  },
  {
    icon: Sparkles,
    title: "Your Passion Sprint",
    body: "A guided 13-week path, one small day at a time. Find it any time in the sidebar.",
  },
  {
    icon: Bot,
    title: "The Blueprint Coach",
    body: "Stuck, or not sure where to start? Ask anytime — it knows your business.",
  },
  {
    icon: Trophy,
    title: "Everything saves automatically",
    body: "Every task you complete lands in your Vault, organized for you — nothing to file yourself.",
  },
];

/**
 * ONBOARDING — TOUCHPOINT 2 (pre-publish audit follow-up, ADHD-Friendly
 * Design Requirement). The first time a business's Builder dashboard
 * ever renders, this replaces silently dropping 15+ features on a
 * member at once with a plain "why" and 4 short, concrete places to
 * start — low working-memory load, one obvious next action.
 */
export function DashboardWelcomeModal({ businessId }: { businessId: string }) {
  const [open, setOpen] = useState(true);
  const [dismissing, setDismissing] = useState(false);

  async function dismiss() {
    if (dismissing) return;
    setDismissing(true);
    // Fire-and-forget-ish: close immediately for a responsive feel, but
    // still await so a failure can be retried rather than silently
    // never persisting (which would show this again next visit).
    const res = await fetch("/api/onboarding/dashboard-welcome-seen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId }),
    });
    setDismissing(false);
    if (res.ok) setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-surface p-7 shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-gold-600">
          Your Blueprint Builder is unlocked
        </p>
        <h2 id="welcome-modal-title" className="mt-1 font-display text-2xl font-semibold text-navy-900">
          Here&apos;s where to start.
        </h2>
        <p className="mt-2 text-sm text-foreground-muted">
          There&apos;s a lot here now — you don&apos;t need all of it today. These four are enough
          to get moving.
        </p>

        <div className="mt-5 flex flex-col gap-4">
          {POINTS.map((point) => (
            <div key={point.title} className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-50 text-gold-600">
                <point.icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-navy-900">{point.title}</p>
                <p className="text-sm text-foreground-muted">{point.body}</p>
              </div>
            </div>
          ))}
        </div>

        <Button size="lg" className="mt-7 w-full" onClick={dismiss} disabled={dismissing}>
          Let&apos;s start building
        </Button>
      </div>
    </div>
  );
}
