import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { assertOrganizationAccess } from "@/lib/organizations/access";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { sponsorBusiness } from "@/lib/organizations/sponsorship";
import { sponsorBusinessSchema } from "@/lib/validations/organization";

/** SPONSORED ACCESS (spec Prompt 12): org ADMIN or platform admin only. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: organizationId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const allowed = await assertOrganizationAccess(user.id, user.role, organizationId, "ADMIN");
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = sponsorBusinessSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const [business, organization] = await Promise.all([
    prisma.business.findUnique({ where: { id: input.businessId } }),
    prisma.organization.findUnique({ where: { id: organizationId } }),
  ]);
  if (!business || !organization) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const membership = await sponsorBusiness({
    businessId: input.businessId,
    organizationId,
    sponsoredUntil: input.sponsoredUntil ? new Date(input.sponsoredUntil) : null,
    grantedByUserId: user.id,
    organizationName: organization.name,
  });

  return NextResponse.json({ membership }, { status: 201 });
}
