import "server-only";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "portfolio-items";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour — regenerated per page view, so no need for longer.

/** Turns a stored object path into a short-lived signed URL for display. Never returns a public URL — the bucket is private. */
export async function getSignedFileUrl(path: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data) {
    console.error("getSignedFileUrl failed", error);
    return null;
  }
  return data.signedUrl;
}

/**
 * Uploads a portfolio file using the request-scoped authenticated client
 * (not the admin client) so the bucket's own RLS policy — mirroring
 * classes.profile_id ownership via the {class_id}/{student_id}/... path
 * — is what actually authorizes the write, same as every other table in
 * this app.
 */
export async function uploadPortfolioFile(params: {
  classId: string;
  studentId: string;
  file: File;
}): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const supabase = createClient();
  const safeName = params.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${params.classId}/${params.studentId}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, params.file, {
    contentType: params.file.type || undefined,
    upsert: false,
  });

  if (error) {
    console.error("uploadPortfolioFile failed", error);
    return { ok: false, error: "Couldn't upload that file." };
  }
  return { ok: true, path };
}
