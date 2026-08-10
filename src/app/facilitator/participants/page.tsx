import { Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ScoreCard } from "@/components/ui/score-card";
import { sessionLabelFor, topStrengthsAndPriorities } from "@/lib/assessment/scoring";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { requireUser } from "@/lib/session";
import { STAGES, type Stage } from "@/lib/utils";

import { AttendanceControl } from "./attendance-control";
import { NoteForm } from "./note-form";

export const metadata: Metadata = { title: "Participants — Blueprint Facilitator" };
export const dynamic = "force-dynamic";

async function getParticipantBusinessIds(userId: string, role: string) {
  if (can.viewAllBusinesses(role as never)) {
    const regs = await prisma.sessionRegistration.findMany({
      where: { businessId: { not: null }, status: { not: "CANCELLED" } },
      select: { businessId: true },
      distinct: ["businessId"],
    });
    return regs.map((r) => r.businessId!).filter(Boolean);
  }

  const [assignments, facilitatedRegs] = await Promise.all([
    prisma.facilitatorAssignment.findMany({
      where: { facilitatorId: userId },
      select: { businessId: true },
    }),
    prisma.sessionRegistration.findMany({
      where: {
        businessId: { not: null },
        status: { not: "CANCELLED" },
        session: { facilitatorId: userId },
      },
      select: { businessId: true },
    }),
  ]);

  return Array.from(
    new Set([...assignments.map((a) => a.businessId), ...facilitatedRegs.map((r) => r.businessId!)]),
  );
}

export default async function FacilitatorParticipantsPage() {
  const user = await requireUser("/facilitator/participants");

  const businessIds = await getParticipantBusinessIds(user.id, user.role);

  if (businessIds.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No participants yet"
        description="Once a member registers for a session you're facilitating (or you're assigned to their business), they'll show up here."
      />
    );
  }

  const businesses = await prisma.business.findMany({
    where: { id: { in: businessIds } },
    include: {
      memberships: { include: { user: true }, orderBy: { createdAt: "asc" }, take: 1 },
      assessments: {
        where: { status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        take: 1,
        include: { scores: true, categoryScores: true },
      },
      sessionRegistrations: {
        where: { status: { not: "CANCELLED" } },
        include: { session: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy-900">Participants</h1>
        <p className="text-sm text-foreground-muted">{businesses.length} business(es)</p>
      </div>

      {businesses.map((business) => {
        const owner = business.memberships[0]?.user;
        const assessment = business.assessments[0];
        const categoryScores =
          assessment?.categoryScores.map((c) => ({
            stage: c.stage as Stage,
            category: c.category,
            scorePercent: c.scorePercent,
          })) ?? [];
        const { strengths, priorities } = topStrengthsAndPriorities(categoryScores);

        return (
          <Card key={business.id}>
            <CardHeader>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <CardTitle>{business.name}</CardTitle>
                {owner && (
                  <span className="text-sm text-foreground-muted">
                    {owner.firstName} {owner.lastName} · {owner.email}
                  </span>
                )}
              </div>
            </CardHeader>

            {assessment ? (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  {assessment.healthScorePercent !== null && (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-navy-100 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                        Health
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-navy-900">
                        {assessment.healthScorePercent}%
                      </p>
                    </div>
                  )}
                  {STAGES.map((stage) => (
                    <ScoreCard
                      key={stage}
                      stage={stage}
                      scorePercent={
                        assessment.scores.find((s) => s.stage === stage)?.scorePercent ?? null
                      }
                    />
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                      Top Strengths
                    </p>
                    <ul className="mt-1 text-foreground-muted">
                      {strengths.map((s) => (
                        <li key={s.category}>
                          {s.category} ({s.scorePercent}%)
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                      Top Priority Areas
                    </p>
                    <ul className="mt-1 text-foreground-muted">
                      {priorities.map((p) => (
                        <li key={p.category}>
                          {p.category} ({p.scorePercent}%)
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {assessment.recommendedSessionType && (
                  <p className="mt-3 text-sm text-navy-700">
                    <span className="font-medium">Recommended Session: </span>
                    {sessionLabelFor(assessment.recommendedSessionType)}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-foreground-muted">No completed assessment yet.</p>
            )}

            {(business.primaryGoal || business.primaryChallenge) && (
              <div className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                {business.primaryGoal && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                      Primary Goal
                    </p>
                    <p className="mt-1 text-foreground-muted">{business.primaryGoal}</p>
                  </div>
                )}
                {business.primaryChallenge && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                      Primary Challenge
                    </p>
                    <p className="mt-1 text-foreground-muted">{business.primaryChallenge}</p>
                  </div>
                )}
              </div>
            )}

            {business.sessionRegistrations.length > 0 && (
              <div className="mt-5 border-t border-navy-100 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">
                  Session Registrations
                </p>
                <div className="flex flex-col gap-2">
                  {business.sessionRegistrations.map((reg) => (
                    <div
                      key={reg.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-navy-50 px-3 py-2 text-sm"
                    >
                      <span>{reg.session.title}</span>
                      <div className="flex items-center gap-3">
                        <AttendanceControl registrationId={reg.id} status={reg.status} />
                        {(reg.status === "ATTENDED" || reg.status === "COMPLETED") && (
                          <Link
                            href={`/facilitator/participants/summary/${reg.id}`}
                            className="text-xs font-medium text-navy-500 underline hover:text-navy-800"
                          >
                            Post-Session Summary
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 border-t border-navy-100 pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">
                Add a Note
              </p>
              <NoteForm businessId={business.id} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
