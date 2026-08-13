import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";
import { syncOfferToBlueprint } from "@/lib/tools/offers";

/**
 * Manual re-sync so a member can choose which of several saved offers
 * currently represents their live one in My Blueprint (creating a new
 * offer already does this automatically — this covers picking an older
 * draft back up).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: offerId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const offer = await prisma.offer.findUnique({ where: { id: offerId } });
  if (!offer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowed = await assertBusinessAccess(user.id, user.role, offer.businessId);
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await syncOfferToBlueprint(offer.businessId, offer);
  const updated = await prisma.offer.update({
    where: { id: offerId },
    data: { savedToBlueprintAt: new Date() },
  });

  return NextResponse.json({ offer: updated });
}
