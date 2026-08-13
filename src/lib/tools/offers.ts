import "server-only";

import type { OfferModel } from "@/generated/prisma/models/Offer";
import { formatCents } from "@/lib/money";
import { upsertBlueprintSection } from "@/lib/roadmap/blueprint";

/** Renders an Offer's fields as the readable My Blueprint section text. */
function formatOfferAsText(offer: OfferModel): string {
  const lines: Array<[string, string | null]> = [
    ["Audience", offer.audience],
    ["Problem", offer.problem],
    ["Outcome", offer.outcome],
    ["Features", offer.features],
    ["Benefits", offer.benefits],
    ["Deliverables", offer.deliverables],
    ["Price", offer.priceCents !== null ? formatCents(offer.priceCents) : null],
    ["Call to Action", offer.cta],
  ];
  return [
    offer.name,
    ...lines.filter(([, v]) => v).map(([label, v]) => `${label}\n${v}`),
  ].join("\n\n");
}

/**
 * OFFER BUILDER's one spec-mandated "saves to My Blueprint" behavior:
 * upserts the "Products & Services" section (the same
 * `blueprintDestination` the Phase 5 "Finalize Products and Services"
 * Builder task already targets) so My Blueprint always reflects whichever
 * offer was most recently saved as the business's current one.
 */
export async function syncOfferToBlueprint(businessId: string, offer: OfferModel): Promise<void> {
  await upsertBlueprintSection(businessId, {
    stage: "POWER",
    title: "Products & Services",
    content: formatOfferAsText(offer),
  });
}
