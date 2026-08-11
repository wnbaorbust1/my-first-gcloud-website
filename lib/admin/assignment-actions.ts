"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdminProfile } from "@/lib/auth/session";
import { assignmentSaveSchema, type AssignmentSaveInput } from "@/lib/admin/assignment-validation";

export type SaveAssignmentResult = { success: true } | { success: false; error: string };

/**
 * Saves every editable field of an assignment, then optionally publishes
 * it. Unlike saveLessonAction, this is a single write — the rubric is
 * inline jsonb on the assignments row itself, not a separate child table,
 * so there's no upsert-before-update sequencing to worry about (see
 * supabase/migrations/20260811090005_assignments.sql: the publish-gate
 * trigger reads new.rubric directly off the same row being updated).
 */
export async function saveAssignmentAction(
  assignmentId: string,
  rawInput: AssignmentSaveInput,
  publish: boolean,
  revalidatePaths: string[],
): Promise<SaveAssignmentResult> {
  const admin = await getAdminProfile();
  if (!admin) {
    return { success: false, error: "You must be an admin to edit assignments." };
  }

  const input = {
    ...rawInput,
    rubric: rawInput.rubric.filter((row) => row.criterion.trim().length > 0),
  };

  const parsed = assignmentSaveSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid assignment data.",
    };
  }

  const supabase = createClient();

  const { error } = await supabase
    .from("assignments")
    .update({
      assignment_type: parsed.data.assignmentType,
      title: parsed.data.title,
      instructions: parsed.data.instructions || null,
      teacher_directions: parsed.data.teacherDirections || null,
      rubric: parsed.data.rubric.map((row) => ({
        criterion: row.criterion,
        points: row.points,
        description: row.description || null,
      })),
      answer_key: parsed.data.answerKey || null,
      status: publish ? "published" : "draft",
    })
    .eq("id", assignmentId);

  if (error) {
    console.error("saveAssignmentAction: update failed", error);
    // Trigger-raised errors (the publish gate, rubric shape) land here
    // with a human-readable message already — surface it as-is.
    return { success: false, error: error.message };
  }

  for (const path of revalidatePaths) revalidatePath(path);

  return { success: true };
}
