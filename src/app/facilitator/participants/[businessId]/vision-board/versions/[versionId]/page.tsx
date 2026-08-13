import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { VisionBoardExport } from "@/lib/blueprint/vision-board";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES } from "@/lib/rbac";
import { assertBusinessAccess, requireRole } from "@/lib/session";

export const metadata: Metadata = { title: "Vision Board Version — Blueprint Facilitator" };
export const dynamic = "force-dynamic";

/** A field row — nothing shown as fabricated when the archived snapshot genuinely had nothing there. */
function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">{label}</p>
      <p className="mt-0.5 text-sm text-navy-800">{value}</p>
    </div>
  );
}

function ListField({ label, values }: { label: string; values: string[] | undefined }) {
  if (!values || values.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">{label}</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {values.map((v, i) => (
          <span key={i} className="rounded-full bg-navy-50 px-2.5 py-0.5 text-xs text-navy-700">
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * REVIEW A PREVIOUS BOARD VERSION (Phase 7: Admin and Facilitator
 * Controls) — a real, complete, read-only render of the snapshot
 * `getVisionBoardExport()` produced the moment this version was saved
 * (Phase 6: Downloads' "Save New Version"). Plain cards, not the
 * member-facing Worksheet visual system — this is an internal review
 * tool, not another deliverable — but every field is the same real data
 * the board itself showed that day.
 */
export default async function VisionBoardVersionDetailPage({
  params,
}: {
  params: Promise<{ businessId: string; versionId: string }>;
}) {
  const { businessId, versionId } = await params;
  const user = await requireRole(STAFF_ROLES, "/facilitator/participants");

  const allowed = await assertBusinessAccess(user.id, user.role, businessId);
  if (!allowed) notFound();

  const version = await prisma.visionBoardVersion.findUnique({
    where: { id: versionId },
    include: { createdBy: { select: { firstName: true, lastName: true } } },
  });
  if (!version || version.businessId !== businessId) notFound();

  const snapshot = version.snapshot as unknown as VisionBoardExport;
  const { board } = snapshot;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/facilitator/participants/${businessId}/vision-board/versions`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Version History
      </Link>

      <h1 className="mt-2 font-display text-2xl font-semibold text-navy-900">
        {snapshot.business.name} — Version {version.version}
      </h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Saved {version.createdAt.toLocaleString()}
        {version.createdBy ? ` by ${version.createdBy.firstName} ${version.createdBy.lastName}` : ""} —
        archived, read-only.
      </p>

      {board.passionAssessment && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Scores at the time</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div className="rounded-xl bg-navy-50 p-3 text-center">
              <p className="text-lg font-semibold text-navy-900">
                {board.passionAssessment.businessHealthPercent ?? "—"}%
              </p>
              <p className="text-xs text-foreground-muted">Health</p>
            </div>
            <div className="rounded-xl bg-navy-50 p-3 text-center">
              <p className="text-lg font-semibold text-navy-900">
                {board.passionAssessment.passionPercent ?? "—"}%
              </p>
              <p className="text-xs text-foreground-muted">Passion</p>
            </div>
            <div className="rounded-xl bg-navy-50 p-3 text-center">
              <p className="text-lg font-semibold text-navy-900">
                {board.passionAssessment.powerPercent ?? "—"}%
              </p>
              <p className="text-xs text-foreground-muted">Power</p>
            </div>
            <div className="rounded-xl bg-navy-50 p-3 text-center">
              <p className="text-lg font-semibold text-navy-900">
                {board.passionAssessment.legacyPercent ?? "—"}%
              </p>
              <p className="text-xs text-foreground-muted">Legacy</p>
            </div>
          </div>
          {snapshot.recommendedSession && (
            <p className="mt-3 text-sm text-navy-700">
              <span className="font-medium">Recommended: </span>
              {snapshot.recommendedSession}
            </p>
          )}
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>My Story &amp; My Why</CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-3">
          <Field label="Passion Statement" value={board.myStory.passionStatement} />
          <ListField label="Superpowers" values={board.myStory.superpowers} />
          <Field label="Why Statement" value={board.myWhy.whyStatement} />
          <Field label="Problem I Solve" value={board.myWhy.problemToSolve} />
          <ListField label="People I Help" values={board.myWhy.peopleToHelp} />
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Legacy</CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-3">
          <Field label="Legacy Statement" value={board.legacy.legacyStatement} />
          <ListField label="Impact Groups" values={board.legacy.impactGroups} />
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Action Plan</CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-3">
          <Field label="First Step" value={board.actionPlan.firstStep} />
          <ListField label="This Week" values={board.actionPlan.thisWeek} />
          <ListField label="This Month" values={board.actionPlan.thisMonth} />
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Vibes &amp; Affirmations</CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-3">
          <ListField label="Vibes" values={board.vibes} />
          <ListField label="Daily Affirmations" values={board.affirmations} />
        </div>
      </Card>
    </div>
  );
}
