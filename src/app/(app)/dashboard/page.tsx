import { CalendarDays, Compass, ListChecks, Sparkles } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ScoreCard } from "@/components/ui/score-card";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { STAGES } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard — Blueprint" };
export const dynamic = "force-dynamic";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const user = await requireUser();

  const membership = await prisma.userBusinessMembership.findFirst({
    where: { userId: user.id },
    include: { business: true },
    orderBy: { createdAt: "asc" },
  });
  const business = membership?.business ?? null;

  const assessment = business
    ? await prisma.assessment.findFirst({
        where: { businessId: business.id },
        include: { scores: true },
        orderBy: { createdAt: "desc" },
      })
    : null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-navy-900">
          {greeting()}, {user.firstName}
        </h1>
        <p className="mt-1 text-foreground-muted">
          {business
            ? `Let's keep building ${business.name}.`
            : "Let's set up your business to get started."}
        </p>
      </div>

      {!business && (
        <EmptyState
          icon={Compass}
          title="Set up your business profile"
          description="Tell us a bit about your business so Blueprint can start building your personalized roadmap."
          action={
            <Button asChild size="lg">
              <Link href="/business-profile">Create My Business Profile</Link>
            </Button>
          }
        />
      )}

      {business && assessment?.status !== "COMPLETED" && (
        <Card className="border-gold-200 bg-gradient-to-br from-gold-50 to-surface">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gold-600">
                Your Blueprint Status
              </p>
              <p className="mt-1 text-lg font-semibold text-navy-900">
                Complete your Blueprint Assessment to begin.
              </p>
              <p className="mt-1 text-sm text-foreground-muted">
                A few minutes of questions unlocks your Passion, Power, and
                Legacy scores and a roadmap built around your business.
              </p>
            </div>
            <Button asChild size="lg" variant="gold" className="w-full shrink-0 sm:w-auto">
              <Link href="/assessment">Start My Assessment</Link>
            </Button>
          </div>
        </Card>
      )}

      {business && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-400">
            Blueprint Scores
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {STAGES.map((stage) => {
              const score = assessment?.scores.find((s) => s.stage === stage);
              return (
                <ScoreCard
                  key={stage}
                  stage={stage}
                  scorePercent={score?.scorePercent ?? null}
                  statusLabel={score ? undefined : "Not started yet"}
                />
              );
            })}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your Next Best Move</CardTitle>
          </CardHeader>
          <EmptyState
            icon={Sparkles}
            title="Nothing to show yet"
            description="Your personalized next action appears here once your assessment and roadmap are set up."
          />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Blueprint</CardTitle>
          </CardHeader>
          <EmptyState
            icon={ListChecks}
            title="No tasks yet"
            description="Must-do, should-do, and bonus tasks will show up here once your roadmap is built."
          />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Roadmap Progress</CardTitle>
          </CardHeader>
          <EmptyState
            icon={Compass}
            title="Your roadmap isn't built yet"
            description="Complete your assessment to generate a personalized roadmap."
          />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Session</CardTitle>
          </CardHeader>
          <EmptyState
            icon={CalendarDays}
            title="No upcoming sessions"
            description="Sessions you register for will appear here."
            action={
              <Button asChild size="sm" variant="outline">
                <Link href="/sessions">Browse Sessions</Link>
              </Button>
            }
          />
        </Card>
      </div>
    </div>
  );
}
