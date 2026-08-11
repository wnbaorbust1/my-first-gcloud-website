"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAdminProfile } from "@/lib/auth/session";

const importRowSchema = z.object({
  code: z.string().trim().min(1).max(50),
  description: z.string().trim().min(1).max(2000),
});

const commitTeksImportSchema = z.object({
  subject: z.string().trim().min(1).max(100),
  rows: z.array(importRowSchema).min(1).max(300),
});

export type CommitTeksImportResult =
  | { success: true; count: number }
  | { success: false; error: string };

/**
 * Commits admin-approved, AI-parsed TEKS rows to the reference table.
 * Upserts by `code` (already unique) so re-importing the same subject
 * updates descriptions in place rather than duplicating rows — the admin
 * has already reviewed/edited every row client-side before this is
 * called, so this is a straightforward write, not another AI step.
 */
export async function commitTeksImportAction(
  rawInput: z.infer<typeof commitTeksImportSchema>,
): Promise<CommitTeksImportResult> {
  const admin = await getAdminProfile();
  if (!admin) {
    return { success: false, error: "You must be an admin to import TEKS standards." };
  }

  const parsed = commitTeksImportSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid import data." };
  }

  const supabase = createClient();

  const { error } = await supabase.from("teks").upsert(
    parsed.data.rows.map((row) => ({
      code: row.code,
      subject: parsed.data.subject,
      description: row.description,
    })),
    { onConflict: "code" },
  );

  if (error) {
    console.error("commitTeksImportAction: upsert failed", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/teks");

  return { success: true, count: parsed.data.rows.length };
}
