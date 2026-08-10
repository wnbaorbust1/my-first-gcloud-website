import { AlertTriangle, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StageBadge } from "@/components/ui/stage-badge";
import { getFacilitatorBusinessIds, getParticipantSummaries } from "@/lib/facilitator/participants";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Facilitator Dashboard — Blueprint" };
export const dynamic = "force-dynamic";

function formatRelative(date: Date | null): string {
  if (!date) return "Never";
  const days = Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export default async function FacilitatorDashboardPage() {
  const user = await requireUser("/facilitator");

  const businessIds = await getFacilitatorBusinessIds(user.id, user.role);

  if (businessIds.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No participants yet"
        description="Once a member registers for a session you're facilitating (or you're assigned to their business), they'll show up here."
      />
    );
  }

  const participants = await getParticipantSummaries(businessIds);
  const stalledCount = participants.filter((p) => p.isStalled).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy-900">Facilitator Dashboard</h1>
        <p className="text-sm text-foreground-muted">
          {participants.length} participant{participants.length === 1 ? "" : "s"}
          {stalledCount > 0 && (
            <>
              {" "}
              ·{" "}
              <span className="inline-flex items-center gap-1 font-medium text-danger">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                {stalledCount} potentially stalled
              </span>
            </>
          )}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {participants.map((p) => (
          <Link key={p.businessId} href={`/facilitator/participants/${p.businessId}`}>
            <Card className="transition-colors hover:border-navy-300">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-navy-900">{p.businessName}</p>
                    {p.currentStage && <StageBadge stage={p.currentStage} />}
                    {p.isStalled && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2.5 py-0.5 text-xs font-semibold text-danger">
                        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                        Stalled
                      </span>
                    )}
                  </div>
                  {p.ownerName && (
                    <p className="text-xs text-foreground-muted">
                      {p.ownerName} · {p.ownerEmail}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground-muted">
                    <span>Current Task: {p.currentTaskTitle ?? "None assigned"}</span>
                    <span>Current Goal: {p.currentGoalTitle ?? "None set"}</span>
                    <span>Last Activity: {formatRelative(p.lastActiveAt)}</span>
                    <span>
                      Session:{" "}
                      {p.lastSessionAttended
                        ? `${p.lastSessionAttended.title} (${p.lastSessionAttended.date.toLocaleDateString()})`
                        : "None attended"}
                    </span>
                  </div>
                </div>
                <div className="grid shrink-0 grid-cols-4 gap-3 text-center">
                  {[
                    ["Passion", p.passionPercent],
                    ["Power", p.powerPercent],
                    ["Legacy", p.legacyPercent],
                    ["Health", p.healthPercent],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                        {label}
                      </p>
                      <p className="text-lg font-semibold text-navy-900">
                        {value === null ? "—" : `${value}%`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
