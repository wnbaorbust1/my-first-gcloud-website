"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdminProfile } from "@/lib/auth/session";
import { lessonSaveSchema, type LessonSaveInput } from "@/lib/admin/validation";

export type SaveLessonResult = { success: true } | { success: false; error: string };

/**
 * Saves every editable field of a lesson, then optionally publishes it.
 *
 * Two sequential writes, deliberately not combined into one: segments are
 * upserted first (keyed on the lesson_id+segment_key unique constraint, so
 * this is always an update-in-place, never a delete+reinsert — that matters
 * because it keeps this safe to call even when the lesson is already
 * published, without tripping the deferred "segments must stay valid"
 * constraint. See supabase/migrations/20260811090004_lessons.sql). Once
 * that upsert has committed, the lesson row itself is updated — including
 * `status` if publishing — which is what runs the publish-gate trigger
 * against the now-current segments.
 */
export async function saveLessonAction(
  lessonId: string,
  rawInput: LessonSaveInput,
  publish: boolean,
  revalidatePaths: string[],
): Promise<SaveLessonResult> {
  const admin = await getAdminProfile();
  if (!admin) {
    return { success: false, error: "You must be an admin to edit lessons." };
  }

  const input = {
    ...rawInput,
    homework: rawInput.homework.map((q) => q.trim()).filter((q) => q.length > 0),
  };

  const parsed = lessonSaveSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid lesson data." };
  }

  const supabase = createClient();

  const segmentRows = parsed.data.segments.map((segment) => ({
    lesson_id: lessonId,
    segment_key: segment.segment_key,
    title: segment.title,
    description: segment.description || null,
    duration_minutes: segment.duration_minutes,
  }));

  const { error: segmentsError } = await supabase
    .from("lesson_segments")
    .upsert(segmentRows, { onConflict: "lesson_id,segment_key" });

  if (segmentsError) {
    console.error("saveLessonAction: segment upsert failed", segmentsError);
    return { success: false, error: segmentsError.message };
  }

  const { error: lessonError } = await supabase
    .from("lessons")
    .update({
      title: parsed.data.title,
      i_do: parsed.data.i_do || null,
      we_do: parsed.data.we_do || null,
      you_do_together: parsed.data.you_do_together || null,
      you_do: parsed.data.you_do || null,
      qsssa_question: parsed.data.qsssa_question || null,
      qsssa_signal: parsed.data.qsssa_signal || null,
      qsssa_stem: parsed.data.qsssa_stem || null,
      qsssa_share: parsed.data.qsssa_share || null,
      qsssa_assess: parsed.data.qsssa_assess || null,
      homework: parsed.data.homework,
      teks_ids: parsed.data.teksIds,
      status: publish ? "published" : "draft",
    })
    .eq("id", lessonId);

  if (lessonError) {
    console.error("saveLessonAction: lesson update failed", lessonError);
    // Trigger-raised errors (the publish gate, TEKS validation) land here
    // with a human-readable message already — surface it as-is.
    return { success: false, error: lessonError.message };
  }

  for (const path of revalidatePaths) revalidatePath(path);

  return { success: true };
}
