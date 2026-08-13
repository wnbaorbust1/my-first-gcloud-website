import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMyBlueprintData } from "@/lib/blueprint/data";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES } from "@/lib/rbac";
import { requireRole } from "@/lib/session";
import { STAGE_META, STAGES } from "@/lib/utils";

import { SectionCard } from "@/app/(app)/my-blueprint/section-card";

export const metadata: Metadata = { title: "My Blueprint — Blueprint Admin" };
export const dynamic = "force-dynamic";

/**
 * Admin edit view of a business's My Blueprint — same SectionCard
 * component and same underlying PATCH /api/blueprint/sections route as
 * the member's own page (src/app/(app)/my-blueprint/page.tsx), just
 * pointed at an admin-chosen businessId instead of the caller's own
 * membership, and without the builderAccessEligible/billing gates —
 * an admin helping a member shouldn't be blocked by that member's own
 * unlock or payment state. assertBusinessAccess (called inside the
 * sections route) already grants ADMIN_ROLES access to any business,
 * so this is purely a UI gap being closed, not a new permission.
 */
export default async function AdminMyBlueprintPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  await requireRole(ADMIN_ROLES, "/admin/businesses");

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) notFound();

  const sectionsByStage = await getMyBlueprintData(businessId);

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href={`/admin/businesses/${businessId}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to {business.name}
      </Link>

      <h1 className="mt-2 font-display text-2xl font-semibold text-navy-900">
        {business.name}&apos;s My Blueprint
      </h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Editing as an admin — changes here are logged to the audit trail, same as a member editing
        their own Blueprint.
      </p>

      <Tabs defaultValue="PASSION" className="mt-6">
        <TabsList>
          {STAGES.map((stage) => (
            <TabsTrigger key={stage} value={stage}>
              <span aria-hidden="true">{STAGE_META[stage].icon}</span> {STAGE_META[stage].label}
            </TabsTrigger>
          ))}
        </TabsList>

        {STAGES.map((stage) => (
          <TabsContent key={stage} value={stage}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {sectionsByStage[stage].map((section) => (
                <SectionCard
                  key={section.title}
                  businessId={businessId}
                  title={section.title}
                  content={section.content}
                  lastEditedAt={section.lastEditedAt?.toISOString() ?? null}
                  updatedAt={section.updatedAt?.toISOString() ?? null}
                  sourceTask={section.sourceTask}
                  builderTask={
                    section.builderTask?.status === "COMPLETED" ? null : section.builderTask
                  }
                />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
