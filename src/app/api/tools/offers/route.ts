import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";
import { syncOfferToBlueprint } from "@/lib/tools/offers";
import { createOfferSchema } from "@/lib/validations/tools";

/**
 * OFFER BUILDER (spec Prompt 10): create an offer and immediately sync it
 * into My Blueprint's "Products & Services" section — the spec's one
 * explicit "Offer builder saves to My Blueprint" acceptance requirement,
 * so it happens by default rather than needing a second manual step.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = createOfferSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const allowed = await assertBusinessAccess(user.id, user.role, input.businessId);
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const offer = await prisma.offer.create({ data: input });

  await syncOfferToBlueprint(input.businessId, offer);
  const saved = await prisma.offer.update({
    where: { id: offer.id },
    data: { savedToBlueprintAt: new Date() },
  });

  return NextResponse.json({ offer: saved }, { status: 201 });
}
