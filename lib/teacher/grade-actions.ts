"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/teacher/roster-actions";
import type { TeksMasteryStatus } from "@/types/supabase";

const recordGradeSchema = z.object({
  kind: z.enum(["assessment", "assignment"]),
  itemId: z.string().uuid(),
  studentId: z.string().uuid(),
  classId: z.string().uuid(),
  score: z.number().min(0),
  maxScore: z.number().positive(),
  date: z.string().optional(), // ISO date (yyyy-mm-dd); defaults to today at the DB layer
});

export type MasterySuggestion = {
  teksCode: string;
  teksDescription: string;
  currentStatus: TeksMasteryStatus;
  suggestedStatus: TeksMasteryStatus;
};

export type RecordGradeData = { suggestions: MasterySuggestion[] };

/**
 * A score-percentage -> mastery-status heuristic. Deliberately simple and
 * a single named function so the thresholds are easy to find and tune —
 * this is the entire "auto-suggest from grades" model. Only ever informs
 * a *suggestion* (see recordGradeAction below); it never writes a status
 * on its own.
 */
function suggestStatusFromScore(percentage: number): TeksMasteryStatus {
  if (percentage >= 0.85) return "mastered";
  if (percentage >= 0.7) return "assessed";
  if (percentage >= 0.5) return "practiced";
  return "needs_reteaching";
}

/**
 * Records one student's grade on one gradable item (an assessment OR an
 * assignment — the unified `grades` table takes exactly one of the two
 * FKs), then computes (but does NOT apply) mastery-status suggestions for
 * every TEKS code tagged on that item — same "AI/heuristic proposes,
 * teacher approves" posture as the semantic-matching feature. The caller
 * renders the returned suggestions and calls updateMasteryStatusAction
 * per accepted one.
 */
export async function recordGradeAction(
  rawInput: z.infer<typeof recordGradeSchema>,
): Promise<ActionResult<RecordGradeData>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const parsed = recordGradeSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid grade." };
  }
  const { kind, itemId, studentId, classId, score, maxScore, date } = parsed.data;

  const supabase = createClient();

  const gradeRow = {
    student_id: studentId,
    assessment_id: kind === "assessment" ? itemId : null,
    assignment_id: kind === "assignment" ? itemId : null,
    score,
    max_score: maxScore,
    ...(date ? { date } : {}),
  };

  const { error: gradeError } = await supabase
    .from("grades")
    .upsert(gradeRow, { onConflict: kind === "assessment" ? "student_id,assessment_id" : "student_id,assignment_id" });

  if (gradeError) {
    console.error("recordGradeAction: grade upsert failed", gradeError);
    return { success: false, error: gradeError.message };
  }

  revalidatePath(`/gradebook/${classId}`);
  revalidatePath(`/teks-mastery/${classId}`);

  const { data: item, error: itemError } = await supabase
    .from(kind === "assessment" ? "assessments" : "assignments")
    .select("teks_ids")
    .eq("id", itemId)
    .maybeSingle();

  if (itemError || !item || item.teks_ids.length === 0) {
    // Grade recorded fine; there's just nothing to suggest mastery
    // updates for (the item isn't tagged with any TEKS codes yet).
    return { success: true, data: { suggestions: [] } };
  }

  const { data: teksRows } = await supabase
    .from("teks")
    .select("code, description")
    .in("id", item.teks_ids);

  const { data: existingMastery } = await supabase
    .from("teks_mastery")
    .select("teks_code, status")
    .eq("student_id", studentId)
    .in("teks_code", (teksRows ?? []).map((t) => t.code));

  const currentStatusByCode = new Map(
    (existingMastery ?? []).map((row) => [row.teks_code, row.status]),
  );

  const percentage = score / maxScore;
  const suggestedStatus = suggestStatusFromScore(percentage);

  const suggestions: MasterySuggestion[] = (teksRows ?? [])
    .map((teks) => ({
      teksCode: teks.code,
      teksDescription: teks.description,
      currentStatus: currentStatusByCode.get(teks.code) ?? "not_started",
      suggestedStatus,
    }))
    .filter((s) => s.currentStatus !== s.suggestedStatus);

  return { success: true, data: { suggestions } };
}
