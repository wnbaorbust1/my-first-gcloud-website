import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminProfile } from "@/lib/auth/session";
import { parseTeksImport } from "@/lib/ai/import-teks";

export const maxDuration = 120;

const requestSchema = z.object({
  subject: z.string().trim().min(1, "Choose a subject.").max(100),
  rawText: z.string().trim().min(1, "Paste in some TEKS text.").max(100000),
});

export async function POST(request: Request) {
  const admin = await getAdminProfile();
  if (!admin) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const result = await parseTeksImport(parsed.data);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ rows: result.rows });
}
