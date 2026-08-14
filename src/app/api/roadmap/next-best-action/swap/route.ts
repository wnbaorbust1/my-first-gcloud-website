import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { loadNextBestActionCandidates, pickSmallerAlternative } from "@/lib/roadmap/next-best-action";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";
import { swapNextBestActionSchema } from "@/lib/validations/next-best-action";

/** "Show me something smaller" (BLUEPRINT_MASTER_SPEC_CLAUDE_CODE.md §13: "allow the user to choose a smaller action"). Returns a real, still-ranked alternative — never a fabricated placeholder task. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = swapNextBestActionSchema.parse(body);
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

  const { ranked } = await loadNextBestActionCandidates(input.businessId);
  const alternative = pickSmallerAlternative(ranked, input.currentTaskId);

  if (!alternative) {
    return NextResponse.json({ alternative: null });
  }

  return NextResponse.json({
    alternative: {
      id: alternative.task.id,
      title: alternative.task.title,
      stage: alternative.task.stage,
      priority: alternative.task.priority,
      estimatedMins: alternative.task.estimatedMins,
      reason: alternative.reason,
    },
  });
}
