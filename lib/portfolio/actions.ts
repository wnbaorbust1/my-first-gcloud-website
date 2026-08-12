"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { uploadPortfolioFile } from "@/lib/portfolio/storage";
import type { ActionResult } from "@/lib/teacher/roster-actions";

const baseFields = z.object({
  studentId: z.string().uuid(),
  classId: z.string().uuid(),
  title: z.string().trim().min(1, "Give it a title.").max(200),
  description: z.string().trim().max(2000).optional(),
  assignmentId: z.string().uuid().optional(),
  submittedDate: z.string().trim().max(10).optional(),
  teacherNotes: z.string().trim().max(2000).optional(),
  revalidatePaths: z.array(z.string()).max(5),
});

// File isn't something zod validates meaningfully (it's an opaque binary
// blob, not structured data) — its presence/absence per artifact type is
// checked by hand below instead of folded into the schema.
type AddPortfolioItemInput =
  | (z.infer<typeof baseFields> & { artifactType: "file"; file: File })
  | (z.infer<typeof baseFields> & { artifactType: "link"; linkUrl: string })
  | (z.infer<typeof baseFields> & { artifactType: "text"; textContent: string });

export async function addPortfolioItemAction(
  rawInput: AddPortfolioItemInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const parsedBase = baseFields.safeParse(rawInput);
  if (!parsedBase.success) {
    return { success: false, error: parsedBase.error.issues[0]?.message ?? "Invalid portfolio item." };
  }
  const base = parsedBase.data;

  const supabase = createClient();
  let filePath: string | null = null;
  let linkUrl: string | null = null;
  let textContent: string | null = null;

  if (rawInput.artifactType === "file") {
    if (!(rawInput.file instanceof File) || rawInput.file.size === 0) {
      return { success: false, error: "Choose a file to upload." };
    }
    const uploaded = await uploadPortfolioFile({
      classId: base.classId,
      studentId: base.studentId,
      file: rawInput.file,
    });
    if (!uploaded.ok) {
      return { success: false, error: uploaded.error };
    }
    filePath = uploaded.path;
  } else if (rawInput.artifactType === "link") {
    const parsedUrl = z.string().trim().url("Enter a valid link.").safeParse(rawInput.linkUrl);
    if (!parsedUrl.success) {
      return { success: false, error: parsedUrl.error.issues[0]?.message ?? "Enter a valid link." };
    }
    linkUrl = parsedUrl.data;
  } else {
    const parsedText = z.string().trim().min(1, "Enter some text.").max(10000).safeParse(rawInput.textContent);
    if (!parsedText.success) {
      return { success: false, error: parsedText.error.issues[0]?.message ?? "Enter some text." };
    }
    textContent = parsedText.data;
  }

  const { data, error } = await supabase
    .from("portfolio_items")
    .insert({
      student_id: base.studentId,
      assignment_id: base.assignmentId || null,
      title: base.title,
      description: base.description || null,
      artifact_type: rawInput.artifactType,
      file_path: filePath,
      link_url: linkUrl,
      text_content: textContent,
      submitted_date: base.submittedDate || undefined,
      teacher_notes: base.teacherNotes || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("addPortfolioItemAction failed", error);
    return { success: false, error: error?.message ?? "Couldn't save that portfolio item." };
  }

  for (const path of base.revalidatePaths) revalidatePath(path);
  return { success: true, data: { id: data.id } };
}

const toggleFeaturedSchema = z.object({
  itemId: z.string().uuid(),
  featured: z.boolean(),
  revalidatePaths: z.array(z.string()).max(5),
});

export async function togglePortfolioItemFeaturedAction(
  rawInput: z.infer<typeof toggleFeaturedSchema>,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const parsed = toggleFeaturedSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: "Invalid request." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("portfolio_items")
    .update({ is_featured: parsed.data.featured })
    .eq("id", parsed.data.itemId);

  if (error) {
    console.error("togglePortfolioItemFeaturedAction failed", error);
    return { success: false, error: error.message };
  }

  for (const path of parsed.data.revalidatePaths) revalidatePath(path);
  return { success: true, data: undefined };
}

const deletePortfolioItemSchema = z.object({
  itemId: z.string().uuid(),
  revalidatePaths: z.array(z.string()).max(5),
});

export async function deletePortfolioItemAction(
  rawInput: z.infer<typeof deletePortfolioItemSchema>,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const parsed = deletePortfolioItemSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: "Invalid request." };
  }

  const supabase = createClient();
  // Storage objects aren't explicitly deleted here — they're orphaned
  // under a dead row rather than actively cleaned up. Acceptable for now
  // (private bucket, no cost/visibility impact beyond storage usage); a
  // real cleanup pass would need the file_path read back before delete.
  const { error } = await supabase.from("portfolio_items").delete().eq("id", parsed.data.itemId);

  if (error) {
    console.error("deletePortfolioItemAction failed", error);
    return { success: false, error: error.message };
  }

  for (const path of parsed.data.revalidatePaths) revalidatePath(path);
  return { success: true, data: undefined };
}
