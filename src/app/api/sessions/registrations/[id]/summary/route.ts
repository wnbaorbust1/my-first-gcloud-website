import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import type { RecommendedSessionType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { hasAnyRole, STAFF_ROLES } from "@/lib/rbac";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";

const SESSION_TYPES: RecommendedSessionType[] = ["PASSION", "POWER", "LEGACY", "GROWTH"];

const summarySchema = z.object({
  top3Priorities: z.array(z.string().trim().min(1)).max(10),
  goal30Day: z.string().trim().max(1000).optional(),
  goal60Day: z.string().trim().max(1000).optional(),
  goal90Day: z.string().trim().max(1000).optional(),
  recommendedTasks: z.array(z.string().trim().min(1)).max(20).optional(),
  recommendedResources: z.array(z.string().trim().min(1)).max(20).optional(),
  nextSuggestedSessionType: z.enum(SESSION_TYPES as [RecommendedSessionType, ...RecommendedSessionType[]]).optional(),
});

async function authorize(registrationId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };

  const registration = await prisma.sessionRegistration.findUnique({
    where: { id: registrationId },
  });
  if (!registration) {
    return { error: NextResponse.json({ error: "Registration not found" }, { status: 404 }) };
  }
  if (!registration.businessId) {
    return { error: NextResponse.json({ error: "No associated business" }, { status: 409 }) };
  }

  const isOwner = registration.userId === user.id;
  const isStaff = hasAnyRole(user.role, STAFF_ROLES);
  const staffAllowed = isStaff && (await assertBusinessAccess(user.id, user.role, registration.businessId));

  if (!isOwner && !staffAllowed) {
    return { error: NextResponse.json({ error: "Not authorized" }, { status: 403 }) };
  }

  return { user, registration, canEdit: staffAllowed };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: registrationId } = await params;
  const auth = await authorize(registrationId);
  if (auth.error) return auth.error;

  const summary = await prisma.postSessionSummary.findUnique({
    where: { sessionRegistrationId: registrationId },
  });
  return NextResponse.json({ summary });
}

/** Facilitator/admin only — create or replace the post-session summary. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: registrationId } = await params;
  const auth = await authorize(registrationId);
  if (auth.error) return auth.error;
  if (!auth.canEdit) {
    return NextResponse.json({ error: "Only a facilitator or admin can edit this." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  let input;
  try {
    input = summarySchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const registration = auth.registration!;
  const summary = await prisma.postSessionSummary.upsert({
    where: { sessionRegistrationId: registrationId },
    create: {
      sessionRegistrationId: registrationId,
      sessionId: registration.sessionId,
      businessId: registration.businessId!,
      facilitatorId: auth.user!.id,
      top3Priorities: input.top3Priorities as never,
      goal30Day: input.goal30Day,
      goal60Day: input.goal60Day,
      goal90Day: input.goal90Day,
      recommendedTasks: (input.recommendedTasks ?? []) as never,
      recommendedResources: (input.recommendedResources ?? []) as never,
      nextSuggestedSessionType: input.nextSuggestedSessionType,
    },
    update: {
      facilitatorId: auth.user!.id,
      top3Priorities: input.top3Priorities as never,
      goal30Day: input.goal30Day,
      goal60Day: input.goal60Day,
      goal90Day: input.goal90Day,
      recommendedTasks: (input.recommendedTasks ?? []) as never,
      recommendedResources: (input.recommendedResources ?? []) as never,
      nextSuggestedSessionType: input.nextSuggestedSessionType,
    },
  });

  return NextResponse.json({ summary });
}
