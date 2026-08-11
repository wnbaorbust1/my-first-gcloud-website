import { Lock, Package } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { MembershipLockedNotice } from "@/components/billing/membership-locked-notice";
import { EditToolModal, type EditField } from "@/components/tools/edit-tool-modal";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getGatedBusinessContext } from "@/lib/billing/access-guard";
import { formatCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

import { CreateOfferForm } from "./create-offer-form";
import { OfferControls } from "./offer-controls";

const OFFER_EDIT_FIELDS: EditField[] = [
  { key: "name", label: "Name", type: "text", required: true, maxLength: 200 },
  { key: "audience", label: "Audience", type: "textarea", rows: 2, maxLength: 2000 },
  { key: "problem", label: "Problem", type: "textarea", rows: 2, maxLength: 2000 },
  { key: "outcome", label: "Outcome", type: "textarea", rows: 2, maxLength: 2000 },
  { key: "features", label: "Features", type: "textarea", rows: 3, maxLength: 4000 },
  { key: "benefits", label: "Benefits", type: "textarea", rows: 3, maxLength: 4000 },
  { key: "deliverables", label: "Deliverables", type: "textarea", rows: 3, maxLength: 4000 },
  { key: "priceCents", label: "Price ($)", type: "money" },
  { key: "cta", label: "Call to Action", type: "text", maxLength: 200 },
];

export const metadata: Metadata = { title: "Offer Builder — Blueprint" };
export const dynamic = "force-dynamic";

export default async function OffersPage() {
  const user = await requireUser();
  const { ub, access } = await getGatedBusinessContext(user.id);

  if (access.locked && access.reason === "not-unlocked") {
    return (
      <EmptyState
        icon={Lock}
        title="The Offer Builder unlocks after your Blueprint Session"
        description="Build a clear, compelling offer once Builder access is unlocked."
        action={
          <Button asChild size="sm">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        }
      />
    );
  }
  if (access.locked) return <MembershipLockedNotice />;

  const businessId = ub!.business.id;
  const offers = await prisma.offer.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-navy-900">Offer Builder</h1>
      <p className="mt-1 text-foreground-muted">
        Build a clear offer for {ub!.business.name} — saving one here also updates the
        &ldquo;Products &amp; Services&rdquo; section of My Blueprint.
      </p>

      <div className="mt-8 flex flex-col gap-4">
        {offers.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Build Your First Offer"
            description="A clear offer is what makes pricing, marketing, and sales all click into place."
          />
        ) : (
          offers.map((offer) => (
            <Card key={offer.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy-900">{offer.name}</p>
                  {offer.outcome && (
                    <p className="mt-1 text-sm text-foreground-muted">{offer.outcome}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground-muted">
                    {offer.priceCents !== null && <span>{formatCents(offer.priceCents)}</span>}
                    {offer.cta && <span>CTA: {offer.cta}</span>}
                  </div>
                  {offer.savedToBlueprintAt && (
                    <p className="mt-2 text-xs font-medium text-legacy-600">
                      ✓ Saved to My Blueprint
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <EditToolModal
                    endpoint={`/api/tools/offers/${offer.id}`}
                    title="Edit Offer"
                    fields={OFFER_EDIT_FIELDS}
                    initialValues={{
                      name: offer.name,
                      audience: offer.audience,
                      problem: offer.problem,
                      outcome: offer.outcome,
                      features: offer.features,
                      benefits: offer.benefits,
                      deliverables: offer.deliverables,
                      priceCents: offer.priceCents,
                      cta: offer.cta,
                    }}
                  />
                  <OfferControls offerId={offer.id} />
                </div>
              </div>
            </Card>
          ))
        )}

        <Card>
          <CardHeader>
            <CardTitle>{offers.length === 0 ? "Create Your First Offer" : "Add Another Offer"}</CardTitle>
          </CardHeader>
          <CreateOfferForm businessId={businessId} />
        </Card>
      </div>
    </div>
  );
}
