import { randomBytes } from "crypto";

import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";

const createSchema = z.object({
  label: z.string().trim().min(1).max(80),
});

function generatePassword(): string {
  return randomBytes(12).toString("base64url");
}

/**
 * ADMIN TEST ACCOUNTS (Phase 7 continued) — a real, dedicated sandbox
 * User + Business an admin can log into (a second browser/incognito
 * window) to see exactly what a member sees at a given membership
 * stage — "what does the free 30-day trial look like," "what does a
 * 1-year subscriber see." Never a real customer's data, never a
 * simulated session swap: a genuine login with a genuine (shown-once)
 * password, same trust model as every other account on this platform.
 * Excluded from every real metric/funnel (src/lib/admin/metrics.ts,
 * src/lib/admin/funnel.ts) via `Business.isTestAccount`.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!can.manageTestAccounts(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const accounts = await prisma.business.findMany({
    where: { isTestAccount: true },
    orderBy: { createdAt: "desc" },
    include: {
      memberships: { include: { user: { select: { id: true, email: true } } }, take: 1 },
    },
  });

  const businessIds = accounts.map((a) => a.id);
  const billingMemberships = await prisma.membership.findMany({ where: { businessId: { in: businessIds } } });
  const byBusiness = new Map(billingMemberships.map((m) => [m.businessId, m]));

  return NextResponse.json({
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      loginEmail: a.memberships[0]?.user.email ?? null,
      builderAccessEligible: a.builderAccessEligible,
      membership: byBusiness.get(a.id) ?? null,
    })),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!can.manageTestAccounts(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = createSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const password = generatePassword();
  const passwordHash = await hashPassword(password);
  const stamp = Date.now().toString(36);
  const email = `test-${stamp}@preview.blueprint.internal`;

  const testUser = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: "Test",
      lastName: "Preview",
      role: "MEMBER",
      emailVerified: new Date(),
    },
  });

  const business = await prisma.business.create({
    data: {
      name: `TEST — ${input.label}`,
      isTestAccount: true,
      industry: "Preview / QA",
      businessStage: "GROWING",
    },
  });
  await prisma.userBusinessMembership.create({ data: { userId: testUser.id, businessId: business.id } });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "test_account_created",
      entityType: "Business",
      entityId: business.id,
      metadata: { label: input.label, loginEmail: email },
    },
  });

  return NextResponse.json(
    { business: { id: business.id, name: business.name }, loginEmail: email, password },
    { status: 201 },
  );
}
