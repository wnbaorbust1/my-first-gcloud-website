"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

const createClassSchema = z.object({
  courseId: z.string().uuid(),
  name: z.string().trim().min(1, "Give the class a name.").max(200),
});

/**
 * Creates a class owned by the signed-in teacher. RLS is the real
 * boundary (classes_all requires profile_id = auth.uid()); the
 * getCurrentUser() check here just fails fast with a clean message
 * instead of a raw RLS rejection for the (rare) signed-out edge case.
 */
export async function createClassAction(
  rawInput: z.infer<typeof createClassSchema>,
): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const parsed = createClassSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid class data." };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("classes")
    .insert({ profile_id: user.id, course_id: parsed.data.courseId, name: parsed.data.name })
    .select("id")
    .single();

  if (error || !data) {
    console.error("createClassAction failed", error);
    return { success: false, error: error?.message ?? "Couldn't create the class." };
  }

  revalidatePath("/teks-mastery");
  return { success: true, data: { id: data.id } };
}

const addStudentSchema = z.object({
  classId: z.string().uuid(),
  name: z.string().trim().min(1, "Enter a name.").max(200),
});

export async function addStudentAction(
  rawInput: z.infer<typeof addStudentSchema>,
): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const parsed = addStudentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid student name." };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("students")
    .insert({ class_id: parsed.data.classId, name: parsed.data.name })
    .select("id")
    .single();

  if (error || !data) {
    console.error("addStudentAction failed", error);
    return { success: false, error: error?.message ?? "Couldn't add the student." };
  }

  revalidatePath(`/teks-mastery/${parsed.data.classId}`);
  return { success: true, data: { id: data.id } };
}

const removeStudentSchema = z.object({
  studentId: z.string().uuid(),
  classId: z.string().uuid(),
});

export async function removeStudentAction(
  rawInput: z.infer<typeof removeStudentSchema>,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const parsed = removeStudentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: "Invalid request." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("students").delete().eq("id", parsed.data.studentId);

  if (error) {
    console.error("removeStudentAction failed", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/teks-mastery/${parsed.data.classId}`);
  return { success: true, data: undefined };
}
