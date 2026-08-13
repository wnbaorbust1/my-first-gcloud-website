import { ArrowLeft, FileText, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MembershipLockedNotice } from "@/components/billing/membership-locked-notice";
import { DOCUMENT_TYPES } from "@/lib/blueprint/documents";
import { getBuilderAccessState, getSyncedMembership } from "@/lib/billing/membership";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Documents — My Blueprint" };
export const dynamic = "force-dynamic";

export default async function DocumentGeneratorPage() {
  const user = await requireUser();

  const membership = await prisma.userBusinessMembership.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: { business: true },
  });

  if (!membership?.business.builderAccessEligible) {
    return (
      <EmptyState
        icon={Lock}
        title="Documents unlock after your Blueprint Session"
        description="Generated documents pull from your My Blueprint content, which starts filling in once you attend your recommended session."
        action={
          <Button asChild size="sm">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        }
      />
    );
  }

  const billingMembership = await getSyncedMembership(membership.businessId);
  const access = getBuilderAccessState(membership.business.builderAccessEligible, billingMembership);
  if (access.locked) return <MembershipLockedNotice />;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/my-blueprint"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to My Blueprint
      </Link>

      <h1 className="mt-4 font-display text-2xl font-semibold text-navy-900">Documents</h1>
      <p className="text-sm text-foreground-muted">
        Generated from your Business Blueprint — always current with what you&apos;ve saved. Each
        one opens as a printable, downloadable page.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {DOCUMENT_TYPES.map((doc) => (
          <Link key={doc.slug} href={`/my-blueprint/documents/${doc.slug}`}>
            <Card className="h-full transition-colors hover:border-navy-300">
              <CardHeader className="flex-row items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-50 text-gold-600">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                </span>
                <CardTitle className="text-base">{doc.title}</CardTitle>
              </CardHeader>
              <p className="text-sm text-foreground-muted">{doc.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
