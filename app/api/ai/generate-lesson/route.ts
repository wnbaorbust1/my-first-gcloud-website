import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAdminProfile } from "@/lib/auth/session";
import { generateLesson } from "@/lib/ai/generate-lesson";

export const maxDuration = 120;

const requestSchema = z.object({
  courseId: z.string().uuid(),
  unitId: z.string().uuid(),
  weekId: z.string().uuid(),
  dayNumber: z.coerce.number().int().min(1).max(5),
  topic: z.string().trim().min(1, "Enter a topic.").max(500),
  notes: z.string().trim().max(2000).optional(),
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
  const { courseId, unitId, weekId, dayNumber, topic, notes } = parsed.data;

  const supabase = createClient();

  // Resolve + validate the course/unit/week actually relate to each other —
  // don't trust the client-supplied IDs to already be consistent.
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, slug, display_name")
    .eq("id", courseId)
    .maybeSingle();
  if (courseError || !course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  const { data: unit, error: unitError } = await supabase
    .from("units")
    .select("id, title, teks_focus_summary, course_id")
    .eq("id", unitId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (unitError || !unit) {
    return NextResponse.json(
      { error: "Unit not found for this course." },
      { status: 404 },
    );
  }

  const { data: week, error: weekError } = await supabase
    .from("weeks")
    .select("id, week_number, title, unit_id, course_id")
    .eq("id", weekId)
    .eq("unit_id", unitId)
    .maybeSingle();
  if (weekError || !week) {
    return NextResponse.json(
      { error: "Week not found for this unit." },
      { status: 404 },
    );
  }

  const { data: existingLesson } = await supabase
    .from("lessons")
    .select("id")
    .eq("week_id", weekId)
    .eq("day_number", dayNumber)
    .maybeSingle();
  if (existingLesson) {
    return NextResponse.json(
      { error: "A lesson already exists for that day — edit it instead of generating a new one." },
      { status: 409 },
    );
  }

  // Candidate TEKS: prefer codes tagged for this course's subject; fall
  // back to the full (small) reference set so the model still has real
  // codes to choose from if none match.
  let { data: candidateTeks } = await supabase
    .from("teks")
    .select("code, description")
    .eq("subject", course.display_name);
  if (!candidateTeks || candidateTeks.length === 0) {
    const { data: allTeks } = await supabase.from("teks").select("code, description");
    candidateTeks = allTeks ?? [];
  }

  const result = await generateLesson({
    courseDisplayName: course.display_name,
    unitTitle: unit.title,
    unitTeksFocusSummary: unit.teks_focus_summary,
    weekTitle: week.title,
    weekNumber: week.week_number,
    dayNumber,
    topic,
    notes,
    candidateTeks,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  const lesson = result.lesson;

  // Resolve the AI's chosen TEKS codes back to real ids, dropping anything
  // that isn't actually in the candidate set we gave it (belt-and-suspenders
  // against a hallucinated code — the lessons.teks_ids trigger would reject
  // it anyway, but this avoids the round-trip failing the whole save).
  let teksIds: string[] = [];
  if (lesson.teks_codes.length > 0) {
    const { data: matchedTeks } = await supabase
      .from("teks")
      .select("id, code")
      .in("code", lesson.teks_codes);
    teksIds = (matchedTeks ?? []).map((t) => t.id);
  }

  const { data: newLesson, error: insertLessonError } = await supabase
    .from("lessons")
    .insert({ week_id: weekId, day_number: dayNumber, title: lesson.title })
    .select("id")
    .single();

  if (insertLessonError || !newLesson) {
    console.error("generate-lesson: failed to create lesson row", insertLessonError);
    return NextResponse.json(
      { error: "Generated a lesson but couldn't save it. Try again." },
      { status: 500 },
    );
  }

  const { error: segmentsError } = await supabase.from("lesson_segments").insert(
    lesson.segments.map((segment) => ({
      lesson_id: newLesson.id,
      segment_key: segment.segment_key,
      title: segment.title,
      description: segment.description,
      duration_minutes: segment.duration_minutes,
    })),
  );

  if (segmentsError) {
    console.error("generate-lesson: failed to create segments", segmentsError);
    return NextResponse.json(
      { error: "Generated a lesson but couldn't save its schedule. Try editing it manually." },
      { status: 500 },
    );
  }

  const { error: updateError } = await supabase
    .from("lessons")
    .update({
      i_do: lesson.i_do,
      we_do: lesson.we_do,
      you_do_together: lesson.you_do_together,
      you_do: lesson.you_do,
      qsssa_question: lesson.qsssa_question,
      qsssa_signal: lesson.qsssa_signal,
      qsssa_stem: lesson.qsssa_stem,
      qsssa_share: lesson.qsssa_share,
      qsssa_assess: lesson.qsssa_assess,
      homework: lesson.homework,
      teks_ids: teksIds,
    })
    .eq("id", newLesson.id);

  if (updateError) {
    console.error("generate-lesson: failed to fill in lesson fields", updateError);
    return NextResponse.json(
      { error: "Generated a lesson but couldn't save all its fields. Try editing it manually." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    lessonId: newLesson.id,
    courseSlug: course.slug,
    weekNumber: week.week_number,
    dayNumber,
  });
}
