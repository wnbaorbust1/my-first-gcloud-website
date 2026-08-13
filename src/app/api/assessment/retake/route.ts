import { NextResponse } from "next/server";
import { z } from "zod";

import { getOrCreateActiveAssessment } from "@/lib/assessment/session";
import { getReassessmentEligibility } from "@/lib/progress/reassessment";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";

const bodySchema = z.object({ businessId: z.string().min(1) });

/** REASSESSMENT (spec Prompt 9): starts a genuinely new Assessment — enforced server-side, not just hidden in the UI, per this app's "protect backend access based on roles/rules" convention. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const allowed = await assertBusinessAccess(user.id, user.role, parsed.data.businessId);
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const eligibility = await getReassessmentEligibility(parsed.data.businessId);
  if (!eligibility.eligible) {
    return NextResponse.json(
      {
        error:
          "Reassessment unlocks 90 days after your last assessment, or once you've completed substantial roadmap progress.",
      },
      { status: 400 },
    );
  }

  const assessment = await getOrCreateActiveAssessment(parsed.data.businessId, { forceNew: true });
  return NextResponse.json({ assessmentId: assessment.id });
}
