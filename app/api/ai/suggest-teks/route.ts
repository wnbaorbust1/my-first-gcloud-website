import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAdminProfile } from "@/lib/auth/session";
import { suggestTeksForContent } from "@/lib/ai/suggest-teks";
import { SEGMENT_ORDER, SEGMENT_LABELS } from "@/lib/curriculum/constants";
import type { LessonSegment } from "@/types/curriculum";

export const maxDuration = 60;

const requestSchema = z.object({
  contentType: z.enum(["lesson", "assignment"]),
  contentId: z.string().uuid(),
});

function formatLessonBody(lesson: {
  i_do: string | null;
  we_do: string | null;
  you_do_together: string | null;
  you_do: string | null;
  homework: string[];
}, segments: LessonSegment[]): string {
  const segmentsText = [...segments]
    .sort((a, b) => SEGMENT_ORDER.indexOf(a.segment_key) - SEGMENT_ORDER.indexOf(b.segment_key))
    .map((s) => `${SEGMENT_LABELS[s.segment_key]}: ${s.title} — ${s.description ?? ""}`)
    .join("\n");

  return `Class period:\n${segmentsText}

I Do: ${lesson.i_do ?? ""}
We Do: ${lesson.we_do ?? ""}
You Do Together: ${lesson.you_do_together ?? ""}
You Do: ${lesson.you_do ?? ""}

Homework:
${lesson.homework.map((q, i) => `${i + 1}. ${q}`).join("\n")}`;
}

function formatAssignmentBody(assignment: {
  instructions: string | null;
  teacher_directions: string | null;
}): string {
  return `Instructions: ${assignment.instructions ?? ""}

Teacher directions: ${assignment.teacher_directions ?? ""}`;
}

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
  const { contentType, contentId } = parsed.data;

  const supabase = createClient();

  let title: string;
  let contentBody: string;
  let courseId: string;

  if (contentType === "lesson") {
    const { data: lesson, error } = await supabase
      .from("lessons")
      .select("*, lesson_segments(*)")
      .eq("id", contentId)
      .maybeSingle();
    if (error || !lesson) {
      return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
    }
    const { lesson_segments, ...lessonFields } = lesson as typeof lesson & {
      lesson_segments: LessonSegment[];
    };
    title = lessonFields.title;
    contentBody = formatLessonBody(lessonFields, lesson_segments);
    courseId = lessonFields.course_id;
  } else {
    const { data: assignment, error } = await supabase
      .from("assignments")
      .select("*")
      .eq("id", contentId)
      .maybeSingle();
    if (error || !assignment) {
      return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
    }
    title = assignment.title;
    contentBody = formatAssignmentBody(assignment);
    courseId = assignment.course_id;
  }

  const { data: course } = await supabase
    .from("courses")
    .select("display_name")
    .eq("id", courseId)
    .maybeSingle();

  let { data: candidateTeks } = await supabase
    .from("teks")
    .select("code, description")
    .eq("subject", course?.display_name ?? "");
  if (!candidateTeks || candidateTeks.length === 0) {
    const { data: allTeks } = await supabase.from("teks").select("code, description");
    candidateTeks = allTeks ?? [];
  }

  const result = await suggestTeksForContent({
    contentTitle: title,
    contentBody,
    candidateTeks,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ matches: result.matches });
}
