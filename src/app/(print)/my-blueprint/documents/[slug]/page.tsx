import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/shared/print-button";
import { DOCUMENT_TYPES, generateDocument } from "@/lib/blueprint/documents";
import { getBuilderAccessState, getSyncedMembership } from "@/lib/billing/membership";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const meta = DOCUMENT_TYPES.find((d) => d.slug === slug);
  return { title: meta ? `${meta.title} — My Blueprint` : "Document — My Blueprint" };
}

export default async function GeneratedDocumentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireUser();

  const membership = await prisma.userBusinessMembership.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: { business: true },
  });
  if (!membership?.business.builderAccessEligible) notFound();

  const billingMembership = await getSyncedMembership(membership.businessId);
  const access = getBuilderAccessState(membership.business.builderAccessEligible, billingMembership);
  if (access.locked) notFound();

  const doc = await generateDocument(membership.businessId, slug);
  if (!doc) notFound();

  return (
    <div>
      <div className="no-print mb-6 flex items-center justify-between">
        <Link
          href="/my-blueprint/documents"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Documents
        </Link>
        <PrintButton />
      </div>

      <article className="print-page rounded-2xl border border-navy-100 bg-surface p-10 shadow-sm shadow-navy-900/5 print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="mb-8 border-b border-navy-100 pb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-600">
            {doc.businessName}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-navy-900">{doc.title}</h1>
          <p className="mt-1 text-sm text-foreground-muted">{doc.subtitle}</p>
          <p className="mt-3 text-xs text-navy-400">
            Generated{" "}
            {doc.generatedAt.toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </header>

        <div className="flex flex-col gap-6">
          {doc.blocks.map((b) => (
            <section key={b.heading}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-navy-700">
                {b.heading}
              </h2>
              {b.paragraphs.map((p, i) => (
                <p key={i} className="whitespace-pre-line text-sm leading-relaxed text-navy-800">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
