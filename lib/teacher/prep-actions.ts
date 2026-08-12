"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { PREP_CATEGORIES, PREP_PRIORITIES } from "@/lib/curriculum/constants";
import type { ActionResult } from "@/lib/teacher/roster-actions";

const addPrepItemSchema = z.object({
  lessonId: z.string().uuid(),
  description: z.string().trim().min(1, "Enter what needs to get done.").max(500),
  category: z.enum(PREP_CATEGORIES),
  dueDate: z.string().trim().max(10).optional(),
  priority: z.enum(PREP_PRIORITIES),
  revalidatePaths: z.array(z.string()).max(5),
});

export async function addPrepItemAction(
  rawInput: z.infer<typeof addPrepItemSchema>,
): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const parsed = addPrepItemSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid prep item." };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("prep_items")
    .insert({
      lesson_id: parsed.data.lessonId,
      profile_id: user.id,
      description: parsed.data.description,
      category: parsed.data.category,
      due_date: parsed.data.dueDate || null,
      priority: parsed.data.priority,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("addPrepItemAction failed", error);
    return { success: false, error: error?.message ?? "Couldn't add that prep item." };
  }

  for (const path of parsed.data.revalidatePaths) revalidatePath(path);
  revalidatePath("/prep-checklist");

  return { success: true, data: { id: data.id } };
}

const toggleCompletedSchema = z.object({
  prepItemId: z.string().uuid(),
  completed: z.boolean(),
});

export async function togglePrepItemCompletedAction(
  rawInput: z.infer<typeof toggleCompletedSchema>,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const parsed = toggleCompletedSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: "Invalid request." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("prep_items")
    .update({ completed: parsed.data.completed })
    .eq("id", parsed.data.prepItemId);

  if (error) {
    console.error("togglePrepItemCompletedAction failed", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/prep-checklist");
  return { success: true, data: undefined };
}

const deletePrepItemSchema = z.object({
  prepItemId: z.string().uuid(),
  revalidatePaths: z.array(z.string()).max(5),
});

export async function deletePrepItemAction(
  rawInput: z.infer<typeof deletePrepItemSchema>,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const parsed = deletePrepItemSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: "Invalid request." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("prep_items").delete().eq("id", parsed.data.prepItemId);

  if (error) {
    console.error("deletePrepItemAction failed", error);
    return { success: false, error: error.message };
  }

  for (const path of parsed.data.revalidatePaths) revalidatePath(path);
  revalidatePath("/prep-checklist");

  return { success: true, data: undefined };
}
