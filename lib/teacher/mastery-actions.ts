"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { MASTERY_STATUSES } from "@/lib/curriculum/constants";
import type { ActionResult } from "@/lib/teacher/roster-actions";

const updateStatusSchema = z.object({
  studentId: z.string().uuid(),
  teksCode: z.string().min(1),
  status: z.enum(MASTERY_STATUSES),
  classId: z.string().uuid(),
});

/**
 * Manual mastery status update — one (student, TEKS code) cell in the
 * grid. Upserts by the table's (student_id, teks_code) unique constraint
 * so setting a status is idempotent regardless of whether a row already
 * existed. RLS (teks_mastery_all, via students -> classes -> profile_id)
 * is the real ownership boundary; getCurrentUser() here just fails fast
 * with a clean message for the signed-out edge case.
 */
export async function updateMasteryStatusAction(
  rawInput: z.infer<typeof updateStatusSchema>,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const parsed = updateStatusSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: "Invalid status update." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("teks_mastery").upsert(
    {
      student_id: parsed.data.studentId,
      teks_code: parsed.data.teksCode,
      status: parsed.data.status,
    },
    { onConflict: "student_id,teks_code" },
  );

  if (error) {
    console.error("updateMasteryStatusAction failed", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/teks-mastery/${parsed.data.classId}`);
  return { success: true, data: undefined };
}
