import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { assertOrganizationAccess } from "@/lib/organizations/access";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { addCohortParticipantSchema } from "@/lib/validations/organization";

/** COHORTS (spec Prompt 12): "Participants can be assigned." */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; cohortId: string }> },
) {
  const { id: organizationId, cohortId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const allowed = await assertOrganizationAccess(user.id, user.role, organizationId, "ADMIN");
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } });
  if (!cohort || cohort.organizationId !== organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = addCohortParticipantSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const business = await prisma.business.findUnique({ where: { id: input.businessId } });
  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const membership = await prisma.cohortMembership.upsert({
    where: { cohortId_businessId: { cohortId, businessId: input.businessId } },
    create: { cohortId, businessId: input.businessId },
    update: {},
  });

  return NextResponse.json({ membership }, { status: 201 });
}
