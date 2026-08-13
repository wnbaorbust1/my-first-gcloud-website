"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/teacher/roster-actions";

const toggleFavoriteSchema = z.object({
  bellRingerId: z.string().uuid(),
  favorite: z.boolean(),
  revalidatePaths: z.array(z.string()).max(5),
});

export async function toggleBellRingerFavoriteAction(
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
    .from("bell_ringers")
    .update({ is_favorite: parsed.data.favorite })
    .eq("id", parsed.data.bellRingerId);

  if (error) {
    console.error("toggleBellRingerFavoriteAction failed", error);
    return { success: false, error: error.message };
  }

  for (const path of parsed.data.revalidatePaths) revalidatePath(path);
  return { success: true, data: undefined };
}

const deleteBellRingerSchema = z.object({
  bellRingerId: z.string().uuid(),
  revalidatePaths: z.array(z.string()).max(5),
});

export async function deleteBellRingerAction(
  rawInput: z.infer<typeof deleteBellRingerSchema>,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const parsed = deleteBellRingerSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: "Invalid request." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("bell_ringers").delete().eq("id", parsed.data.bellRingerId);

  if (error) {
    console.error("deleteBellRingerAction failed", error);
    return { success: false, error: error.message };
  }

  for (const path of parsed.data.revalidatePaths) revalidatePath(path);
  return { success: true, data: undefined };
}
