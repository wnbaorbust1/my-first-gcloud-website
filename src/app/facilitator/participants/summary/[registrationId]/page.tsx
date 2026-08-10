import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { STAFF_ROLES } from "@/lib/rbac";
import { assertBusinessAccess, requireRole } from "@/lib/session";

import { SummaryForm } from "./summary-form";

export const metadata: Metadata = { title: "Post-Session Summary — Blueprint Facilitator" };
export const dynamic = "force-dynamic";

export default async function PostSessionSummaryPage({
  params,
}: {
  params: Promise<{ registrationId: string }>;
}) {
  const { registrationId } = await params;
  const user = await requireRole(STAFF_ROLES, "/facilitator/participants");

  const registration = await prisma.sessionRegistration.findUnique({
    where: { id: registrationId },
    include: { session: true, business: true, user: true, postSessionSummary: true },
  });
  if (!registration || !registration.business) notFound();

  const allowed = await assertBusinessAccess(user.id, user.role, registration.business.id);
  if (!allowed) notFound();

  const summary = registration.postSessionSummary;

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/facilitator/participants"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to participants
      </Link>

      <h1 className="mt-4 font-display text-2xl font-semibold text-navy-900">
        Post-Session Summary
      </h1>
      <p className="text-sm text-foreground-muted">
        {registration.business.name} · {registration.session.title} ·{" "}
        {registration.user.firstName} {registration.user.lastName}
      </p>

      <div className="mt-6">
        <SummaryForm
          registrationId={registrationId}
          initial={{
            top3Priorities: (summary?.top3Priorities as string[] | undefined) ?? [],
            goal30Day: summary?.goal30Day ?? "",
            goal60Day: summary?.goal60Day ?? "",
            goal90Day: summary?.goal90Day ?? "",
            recommendedTasks: (summary?.recommendedTasks as string[] | undefined) ?? [],
            recommendedResources: (summary?.recommendedResources as string[] | undefined) ?? [],
            nextSuggestedSessionType: summary?.nextSuggestedSessionType ?? "",
          }}
        />
      </div>
    </div>
  );
}
