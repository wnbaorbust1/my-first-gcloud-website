import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";

const AI_MODES = [
  "BUSINESS_COACH",
  "STRATEGIST",
  "COPYWRITER",
  "MARKETING_ASSISTANT",
  "SALES_COACH",
  "SYSTEMS_BUILDER",
  "FINANCE_GUIDE",
  "IMPLEMENTATION_GUIDE",
] as const;

const upsertSchema = z.object({
  mode: z.enum(AI_MODES),
  systemPromptFragment: z.string().trim().min(1).max(4000),
  isActive: z.boolean().default(true),
});

/**
 * CONTENT MANAGEMENT (spec Prompt 11): "Admin should manage: AI Prompt
 * Templates." One override row per mode (upsert-by-mode) — see
 * src/lib/ai/system-prompt.ts for how a live conversation resolves this
 * against the Phase 7 hardcoded default.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!can.manageContent(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = upsertSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const template = await prisma.aiPromptTemplate.upsert({
    where: { mode: input.mode },
    create: {
      mode: input.mode,
      systemPromptFragment: input.systemPromptFragment,
      isActive: input.isActive,
      updatedByUserId: user.id,
    },
    update: {
      systemPromptFragment: input.systemPromptFragment,
      isActive: input.isActive,
      updatedByUserId: user.id,
    },
  });

  return NextResponse.json({ template }, { status: 201 });
}
