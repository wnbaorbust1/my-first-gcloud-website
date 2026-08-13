import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { toFormValues } from "@/app/(app)/my-blueprint/vision-board/form-values";
import { VisionBoardForm } from "@/app/(app)/my-blueprint/vision-board/vision-board-form";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES } from "@/lib/rbac";
import { assertBusinessAccess, requireRole } from "@/lib/session";

export const metadata: Metadata = { title: "Vision Board Recommendations — Blueprint Facilitator" };
export const dynamic = "force-dynamic";

/**
 * FACILITATOR EDIT ACCESS (Phase 3: AI Blueprint Generator — "let the
 * facilitator edit recommendations after the session"): the same
 * VisionBoardForm the member and an admin use, reused as-is — the
 * underlying PATCH/promote routes already authorize via
 * assertBusinessAccess, which already grants a facilitator access to
 * any business they're assigned to (FacilitatorAssignment) or running a
 * session for, exactly like every other facilitator surface. The only
 * gap was a dedicated page; this is that page, scoped to assigned
 * participants only — never every business, unlike the admin equivalent.
 */
export default async function FacilitatorVisionBoardPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const user = await requireRole(STAFF_ROLES, "/facilitator/participants");

  const allowed = await assertBusinessAccess(user.id, user.role, businessId);
  if (!allowed) notFound();

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { visionBoardProfile: true },
  });
  if (!business) notFound();

  const { initial, initialNext90Days, sectionSources } = toFormValues(business.visionBoardProfile);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/facilitator/participants/${businessId}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to {business.name}
      </Link>

      <h1 className="mt-2 font-display text-2xl font-semibold text-navy-900">
        {business.name}&apos;s Vision Board Recommendations
      </h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Editing as a facilitator. Nothing here is invented on the member&apos;s behalf — leave a
        field blank if you don&apos;t have real information for it. Sections marked{" "}
        <strong>AI Suggested</strong> came from a promoted AI draft and haven&apos;t been hand-edited
        since.
      </p>

      <div className="mt-6">
        <VisionBoardForm
          businessId={businessId}
          initial={initial}
          initialNext90Days={initialNext90Days}
          initialSectionSources={sectionSources}
        />
      </div>
    </div>
  );
}
