import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";
import { createOrganizationSchema } from "@/lib/validations/organization";

/** ORGANIZATION ACCOUNTS (spec Prompt 12): "Organizations can be created" — platform-admin only. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!can.manageOrganizations(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = createOrganizationSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const organization = await prisma.organization.create({ data: input });

  // The creating admin also becomes the org's first ADMIN member, so
  // they can immediately manage it from /organization without a second
  // platform-admin action.
  await prisma.organizationMembership.create({
    data: { organizationId: organization.id, userId: user.id, role: "ADMIN" },
  });

  return NextResponse.json({ organization }, { status: 201 });
}
