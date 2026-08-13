import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { businessProfileSchema } from "@/lib/validations/business";

/**
 * Create-or-update the current user's business profile.
 *
 * MVP scope (Task 6/10): a user has at most one business today, so this
 * upserts against their existing membership rather than requiring a
 * separate edit endpoint. Multi-business support later just means adding
 * a "new business" affordance that skips this lookup — the underlying
 * data model (UserBusinessMembership) already supports many.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  let input;
  try {
    input = businessProfileSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const existingMembership = await prisma.userBusinessMembership.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  const business = existingMembership
    ? await prisma.business.update({
        where: { id: existingMembership.businessId },
        data: input,
      })
    : await prisma.business.create({
        data: {
          ...input,
          memberships: {
            create: { userId: user.id, role: "OWNER" },
          },
        },
      });

  return NextResponse.json(
    { business },
    { status: existingMembership ? 200 : 201 },
  );
}
