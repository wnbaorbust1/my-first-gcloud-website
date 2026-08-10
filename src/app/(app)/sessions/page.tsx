import { Calendar, CheckCircle2, MapPin, PackageCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StageBadge } from "@/components/ui/stage-badge";
import { sessionLabelFor } from "@/lib/assessment/scoring";
import { getSeatsRemaining, getUpcomingSessions } from "@/lib/sessions/queries";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import type { Stage } from "@/lib/utils";

import { RegisterButton } from "./register-button";
import { RegistrationStatus } from "./registration-status";
import { SESSION_TYPE_DISPLAY } from "../assessment/results/session-type-display";

export const metadata: Metadata = { title: "Blueprint Sessions — Blueprint" };
export const dynamic = "force-dynamic";

function formatSessionDate(date: Date, timezone: string) {
  return date.toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
    timeZoneName: "short",
  });
}

export default async function SessionsPage() {
  const user = await requireUser();

  const membership = await prisma.userBusinessMembership.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: { business: { select: { id: true, name: true } } },
  });

  const latestAssessment = membership
    ? await prisma.assessment.findFirst({
        where: { businessId: membership.businessId, status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
      })
    : null;

  const recommendedType = latestAssessment?.recommendedSessionType ?? null;

  const [allUpcoming, myRegistrations] = await Promise.all([
    getUpcomingSessions(),
    prisma.sessionRegistration.findMany({
      where: { userId: user.id, status: { in: ["REGISTERED", "WAITLISTED"] } },
    }),
  ]);

  const registrationBySessionId = new Map(myRegistrations.map((r) => [r.sessionId, r]));
  const seatsBySessionId = new Map(
    await Promise.all(
      allUpcoming.map(
        async (s) => [s.id, await getSeatsRemaining(s.id, s.capacity)] as const,
      ),
    ),
  );

  const recommendedSessions = recommendedType
    ? allUpcoming.filter((s) => s.sessionType === recommendedType)
    : [];
  const otherSessions = allUpcoming.filter((s) => s.sessionType !== recommendedType);
  const recommendedTemplate = recommendedSessions[0];

  function SessionDateRow({ session }: { session: (typeof allUpcoming)[number] }) {
    const registration = registrationBySessionId.get(session.id);
    const seatsRemaining = seatsBySessionId.get(session.id) ?? null;
    const hasRoom = seatsRemaining === null || seatsRemaining > 0;

    return (
      <div
        key={session.id}
        className="flex flex-col gap-3 rounded-xl border border-navy-100 p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-800">
            <Calendar className="h-4 w-4 text-navy-400" aria-hidden="true" />
            {formatSessionDate(session.startsAt, session.timezone)}
          </p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-foreground-muted">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {session.format === "VIRTUAL" ? "Virtual" : session.location ?? "In person"}
            {seatsRemaining !== null && (
              <span>
                · {seatsRemaining} seat{seatsRemaining === 1 ? "" : "s"} left
              </span>
            )}
          </p>
        </div>
        <div className="w-full sm:w-48">
          {registration ? (
            <RegistrationStatus
              registrationId={registration.id}
              status={registration.status as "REGISTERED" | "WAITLISTED"}
              waitlistPosition={registration.waitlistPosition}
            />
          ) : (
            <RegisterButton sessionId={session.id} hasRoom={hasRoom} size="sm" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-3xl font-semibold text-navy-900">Blueprint Sessions</h1>
      <p className="mt-1 text-foreground-muted">
        Facilitator-led sessions to help you build the next stage of your Blueprint.
      </p>

      {recommendedTemplate ? (
        <Card className="mt-8 border-gold-200">
          <div className="flex items-start gap-3">
            <span className="text-3xl" aria-hidden="true">
              {SESSION_TYPE_DISPLAY[recommendedType!].icon}
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-600">
                Recommended for You
              </p>
              <h2 className="mt-0.5 text-xl font-semibold text-navy-900">
                {sessionLabelFor(recommendedType!)}
              </h2>
            </div>
          </div>

          {latestAssessment?.recommendationReason && (
            <p className="mt-3 text-sm text-foreground-muted">
              <span className="font-medium text-navy-700">Why this was recommended: </span>
              {latestAssessment.recommendationReason}
            </p>
          )}

          <p className="mt-3 text-sm text-navy-700">{recommendedTemplate.description}</p>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.isArray(recommendedTemplate.learningOutcomes) &&
              recommendedTemplate.learningOutcomes.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                    What You&apos;ll Learn
                  </p>
                  <ul className="mt-2 flex flex-col gap-1.5 text-sm text-foreground-muted">
                    {(recommendedTemplate.learningOutcomes as string[]).map((o) => (
                      <li key={o} className="flex items-start gap-1.5">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
                        {o}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            <div>
              {recommendedTemplate.whatYoullBuild && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                    What You&apos;ll Build
                  </p>
                  <p className="mt-2 flex items-start gap-1.5 text-sm text-foreground-muted">
                    <PackageCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-navy-400" aria-hidden="true" />
                    {recommendedTemplate.whatYoullBuild}
                  </p>
                </>
              )}
              {recommendedTemplate.whatToBring && (
                <p className="mt-3 text-xs text-foreground-muted">
                  <span className="font-medium text-navy-600">What to bring: </span>
                  {recommendedTemplate.whatToBring}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">
              Available Dates
            </p>
            <div className="flex flex-col gap-3">
              {recommendedSessions.map((session) => (
                <SessionDateRow key={session.id} session={session} />
              ))}
            </div>
          </div>
        </Card>
      ) : (
        <EmptyState
          className="mt-8"
          icon={Calendar}
          title={
            membership
              ? "Complete your assessment for a personalized recommendation"
              : "Set up your business to see recommended sessions"
          }
          description={
            membership
              ? "Your Blueprint Assessment matches you to the session that fits where your business is today."
              : "Create your business profile, then complete your assessment."
          }
          action={
            <Button asChild size="sm">
              <Link href={membership ? "/assessment" : "/business-profile"}>
                {membership ? "Start My Assessment" : "Create My Business Profile"}
              </Link>
            </Button>
          }
        />
      )}

      {otherSessions.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-400">
            Other Sessions
          </h2>
          <div className="flex flex-col gap-4">
            {Object.entries(
              otherSessions.reduce<Record<string, typeof otherSessions>>((acc, s) => {
                (acc[s.sessionType] ??= []).push(s);
                return acc;
              }, {}),
            ).map(([type, sessions]) => (
              <Card key={type}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    {type !== "GROWTH" && <StageBadge stage={type as Stage} />}
                    <CardTitle>{sessionLabelFor(type as never)}</CardTitle>
                  </div>
                </CardHeader>
                <div className="flex flex-col gap-3">
                  {sessions.map((session) => (
                    <SessionDateRow key={session.id} session={session} />
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
