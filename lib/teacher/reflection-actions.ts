"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { PACING_ACCURACY_OPTIONS, ENGAGEMENT_LEVEL_OPTIONS } from "@/lib/curriculum/constants";
import type { ActionResult } from "@/lib/teacher/roster-actions";

const saveReflectionSchema = z.object({
  lessonId: z.string().uuid(),
  whatWorked: z.string().trim().max(4000),
  whatConfusedStudents: z.string().trim().max(4000),
  pacingAccuracy: z.enum(PACING_ACCURACY_OPTIONS).nullable(),
  engagementLevel: z.enum(ENGAGEMENT_LEVEL_OPTIONS).nullable(),
  reteachFlag: z.boolean(),
  actionItems: z.string().trim().max(4000),
  isFavorite: z.boolean(),
  revalidatePaths: z.array(z.string()).max(5),
});

/**
 * The quick-entry form's single save path — upserts by the table's
 * (profile_id, lesson_id) unique constraint, so writing a reflection for
 * a lesson the teacher already reflected on just refines that same row
 * rather than accumulating duplicates.
 */
export async function saveReflectionAction(
  rawInput: z.infer<typeof saveReflectionSchema>,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const parsed = saveReflectionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid reflection." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("reflections").upsert(
    {
      lesson_id: parsed.data.lessonId,
      profile_id: user.id,
      what_worked: parsed.data.whatWorked || null,
      what_confused_students: parsed.data.whatConfusedStudents || null,
      pacing_accuracy: parsed.data.pacingAccuracy,
      engagement_level: parsed.data.engagementLevel,
      reteach_flag: parsed.data.reteachFlag,
      action_items: parsed.data.actionItems || null,
      is_favorite: parsed.data.isFavorite,
    },
    { onConflict: "profile_id,lesson_id" },
  );

  if (error) {
    console.error("saveReflectionAction failed", error);
    return { success: false, error: error.message };
  }

  for (const path of parsed.data.revalidatePaths) revalidatePath(path);
  revalidatePath("/reflections");

  return { success: true, data: undefined };
}

const toggleFavoriteSchema = z.object({
  reflectionId: z.string().uuid(),
  isFavorite: z.boolean(),
});

/** Quick unfavorite/favorite from the favorites list itself, without
 * opening the full quick-entry form. */
export async function toggleFavoriteAction(
  rawInput: z.infer<typeof toggleFavoriteSchema>,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const parsed = toggleFavoriteSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: "Invalid request." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("reflections")
    .update({ is_favorite: parsed.data.isFavorite })
    .eq("id", parsed.data.reflectionId);

  if (error) {
    console.error("toggleFavoriteAction failed", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/reflections");
  return { success: true, data: undefined };
}
