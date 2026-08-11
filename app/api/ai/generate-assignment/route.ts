import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAdminProfile } from "@/lib/auth/session";
import { generateAssignment } from "@/lib/ai/generate-assignment";
import { ASSIGNMENT_TYPES } from "@/lib/curriculum/constants";

export const maxDuration = 120;

const requestSchema = z.object({
  unitId: z.string().uuid(),
  assignmentType: z.enum(ASSIGNMENT_TYPES),
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
  const { unitId, assignmentType, topic, notes } = parsed.data;

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

  const result = await generateAssignment({
    courseDisplayName: course.display_name,
    unitTitle: unit.title,
    unitTeksFocusSummary: unit.teks_focus_summary,
    assignmentType,
    topic,
    notes,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  const assignment = result.assignment;

  // Single insert — unlike lessons, an assignment has no separate child
  // table to write after the row exists (the rubric is inline jsonb), so
  // this is one call instead of lessons' insert-then-segments-then-update
  // sequence.
  const { data: newAssignment, error: insertError } = await supabase
    .from("assignments")
    .insert({
      unit_id: unitId,
      assignment_type: assignmentType,
      title: assignment.title,
      instructions: assignment.instructions,
      teacher_directions: assignment.teacher_directions,
      rubric: assignment.rubric,
      answer_key: assignment.answer_key,
    })
    .select("id")
    .single();

  if (insertError || !newAssignment) {
    console.error("generate-assignment: failed to save assignment", insertError);
    return NextResponse.json(
      { error: "Generated an assignment but couldn't save it. Try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    assignmentId: newAssignment.id,
    courseSlug: course.slug,
  });
}
