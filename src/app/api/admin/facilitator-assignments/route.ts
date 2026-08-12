import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";

const createSchema = z.object({
  facilitatorId: z.string().min(1),
  ownerEmail: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

/**
 * Assigns a facilitator to a business (Known Issue #28 / audit finding:
 * "no admin UI to create FacilitatorAssignments" — this was previously a
 * direct DB write in test scripts only). Takes the business owner's
 * account email rather than a raw businessId — the same pattern already
 * used for organization cohort/sponsorship lookups — since that's what an
 * admin actually has on hand, not an internal id.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!can.manageUsers(user.role)) {
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

  const facilitator = await prisma.user.findUnique({ where: { id: input.facilitatorId } });
  if (!facilitator) {
    return NextResponse.json({ error: "Facilitator not found" }, { status: 404 });
  }

  const owner = await prisma.user.findUnique({
    where: { email: input.ownerEmail },
    include: { businessMemberships: { orderBy: { createdAt: "asc" }, take: 1 } },
  });
  const businessId = owner?.businessMemberships[0]?.businessId;
  if (!businessId) {
    return NextResponse.json(
      { error: "No business found for that email" },
      { status: 404 },
    );
  }

  const assignment = await prisma.facilitatorAssignment.upsert({
    where: { facilitatorId_businessId: { facilitatorId: input.facilitatorId, businessId } },
    create: { facilitatorId: input.facilitatorId, businessId },
    update: {},
  });

  return NextResponse.json({ assignment }, { status: 201 });
}

const deleteSchema = z.object({ assignmentId: z.string().min(1) });

/** Removes a wrong/stale assignment — the only way today to fix a mis-typed email. */
export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!can.manageUsers(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = deleteSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await prisma.facilitatorAssignment.delete({ where: { id: input.assignmentId } }).catch(() => null);
  return NextResponse.json({ ok: true });
}

/** List existing assignments so the admin screen can show what's already wired up. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!can.manageUsers(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const assignments = await prisma.facilitatorAssignment.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      facilitator: { select: { firstName: true, lastName: true, email: true } },
      business: { select: { name: true } },
    },
  });

  return NextResponse.json({ assignments });
}
