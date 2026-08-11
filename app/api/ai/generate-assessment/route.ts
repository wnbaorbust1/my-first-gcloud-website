import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAdminProfile } from "@/lib/auth/session";
import { generateAssessment } from "@/lib/ai/generate-assessment";

export const maxDuration = 120;

const requestSchema = z.object({
  unitId: z.string().uuid(),
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
  const { unitId, topic, notes } = parsed.data;

  const supabase = createClient();

  const { data: unit, error: unitError } = await supabase
    .from("units")
    .select("id, title, teks_focus_summary, course_id")
    .eq("id", unitId)
    .maybeSingle();
  if (unitError || !unit) {
    return NextResponse.json({ error: "Unit not found." }, { status: 404 });
  }

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, slug, display_name")
    .eq("id", unit.course_id)
    .maybeSingle();
  if (courseError || !course) {
    return NextResponse.json({ error: "Course not found for this unit." }, { status: 404 });
  }

  const result = await generateAssessment({
    courseDisplayName: course.display_name,
    unitTitle: unit.title,
    unitTeksFocusSummary: unit.teks_focus_summary,
    topic,
    notes,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  const { data: newAssessment, error: insertError } = await supabase
    .from("assessments")
    .insert({
      unit_id: unitId,
      title: result.title,
      questions: result.questions,
      answer_key: result.answerKey,
    })
    .select("id")
    .single();

  if (insertError || !newAssessment) {
    console.error("generate-assessment: failed to save assessment", insertError);
    return NextResponse.json(
      { error: "Generated an assessment but couldn't save it. Try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ assessmentId: newAssessment.id, courseSlug: course.slug });
}
