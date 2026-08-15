import { CalendarCheck, ClipboardCheck, Compass, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Welcome — Blueprint" };
export const dynamic = "force-dynamic";

const STEPS = [
  {
    icon: ClipboardCheck,
    title: "Take the Assessment",
    time: "~10 minutes",
    body: "A short set of questions about your business today — Passion, Power, and Legacy. Your answers save automatically, so you can stop and pick up right where you left off.",
  },
  {
    icon: CalendarCheck,
    title: "Attend Your Recommended Session",
    time: "one live session",
    body: "Your results point you to the Blueprint session built for exactly where your business stands right now.",
  },
  {
    icon: Compass,
    title: "Your Blueprint Unlocks",
    time: "ongoing",
    body: "Your personalized roadmap, a guided 13-week Passion Sprint, tools, an AI coach, and a growing Vault of everything you build — all built around your business, not a generic template.",
  },
];

/**
 * ONBOARDING — TOUCHPOINT 1 (pre-publish audit follow-up, ADHD-Friendly
 * Design Requirement). A member's very first stop after creating their
 * business profile, before the Assessment ("the quiz") — which only
 * ever explained itself, never the journey around it. Plain "why," a
 * short numbered "how," and one obvious next action, per the ratified
 * ADHD-friendly convention (docs/BLUEPRINT_MASTER_SPEC.md).
 */
export default async function WelcomePage() {
  const user = await requireUser();

  const membership = await prisma.userBusinessMembership.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: { business: true },
  });

  if (!membership) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Set up your business first"
        description="Tell us about your business to get started."
        action={
          <Button asChild size="sm">
            <Link href="/business-profile">Create My Business Profile</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-sm font-semibold uppercase tracking-wide text-gold-600">
        Welcome to Blueprint
      </p>
      <h1 className="mt-1 font-display text-3xl font-semibold text-navy-900">
        {membership.business.name}, here&apos;s what happens next.
      </h1>
      <p className="mt-3 text-foreground-muted">
        Three real steps stand between you and a Business Blueprint built specifically around{" "}
        {membership.business.name} — not a template. Here&apos;s the whole path, so nothing
        feels like a surprise along the way.
      </p>

      <div className="mt-8 flex flex-col gap-4">
        {STEPS.map((step, i) => (
          <Card key={step.title} className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-50 font-display text-lg font-semibold text-gold-600">
              {i + 1}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <step.icon className="h-4 w-4 text-navy-400" aria-hidden="true" />
                <h2 className="font-semibold text-navy-900">{step.title}</h2>
                <span className="text-xs text-foreground-muted">· {step.time}</span>
              </div>
              <p className="mt-1.5 text-sm text-foreground-muted">{step.body}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <Button asChild size="lg">
          <Link href="/assessment">Start My Assessment</Link>
        </Button>
      </div>
    </div>
  );
}
