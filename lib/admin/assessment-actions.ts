"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdminProfile } from "@/lib/auth/session";
import { assessmentSaveSchema, type AssessmentSaveInput } from "@/lib/admin/assessment-validation";

export type SaveAssessmentResult = { success: true } | { success: false; error: string };

/**
 * Saves every editable field of an assessment, then optionally publishes
 * it. Single update — like assignments, questions are inline jsonb on
 * the same row, no child-table sequencing to worry about.
 */
export async function saveAssessmentAction(
  assessmentId: string,
  rawInput: AssessmentSaveInput,
  publish: boolean,
  revalidatePaths: string[],
): Promise<SaveAssessmentResult> {
  const admin = await getAdminProfile();
  if (!admin) {
    return { success: false, error: "You must be an admin to edit assessments." };
  }

  const parsed = assessmentSaveSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid assessment data." };
  }

  const supabase = createClient();

  const { error } = await supabase
    .from("assessments")
    .update({
      title: parsed.data.title,
      questions: parsed.data.questions,
      answer_key: parsed.data.answerKey || null,
      teks_ids: parsed.data.teksIds,
      status: publish ? "published" : "draft",
    })
    .eq("id", assessmentId);

  if (error) {
    console.error("saveAssessmentAction: update failed", error);
    return { success: false, error: error.message };
  }

  for (const path of revalidatePaths) revalidatePath(path);

  return { success: true };
}
