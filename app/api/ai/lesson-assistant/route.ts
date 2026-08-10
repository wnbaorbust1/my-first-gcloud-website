import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminProfile } from "@/lib/auth/session";
import { requestLessonAssistantEdit } from "@/lib/ai/lesson-assistant";
import { lessonSnapshotSchema } from "@/lib/ai/schemas";

export const maxDuration = 60;

const requestSchema = z.object({
  lesson: lessonSnapshotSchema,
  instruction: z.string().trim().min(1, "Enter an instruction.").max(1000),
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

  const result = await requestLessonAssistantEdit(
    parsed.data.lesson,
    parsed.data.instruction,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ edit: result.edit });
}
