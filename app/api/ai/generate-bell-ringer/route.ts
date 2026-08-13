import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasCourseAccess } from "@/lib/billing/access";
import { generateBellRinger } from "@/lib/ai/generate-bell-ringer";

export const maxDuration = 60;

const requestSchema = z.object({
  classId: z.string().uuid(),
  mode: z.enum(["topic", "spiral_review"]),
  topic: z.string().trim().max(500).optional(),
});

// How many recently-touched TEKS to offer as spiral-review candidates —
// enough for the model to pick a good one without flooding the prompt.
const SPIRAL_REVIEW_CANDIDATE_LIMIT = 15;
const SPIRAL_REVIEW_STATUSES = ["practiced", "assessed", "mastered"] as const;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }
  const { classId, mode, topic } = parsed.data;

  if (mode === "topic" && !topic?.trim()) {
    return NextResponse.json({ error: "Enter a topic." }, { status: 400 });
  }

  const supabase = createClient();

  // classes_all's RLS already scopes this to the signed-in teacher's own
  // class (or an admin) — a class id that isn't theirs simply comes back
  // null, same as a genuinely missing one.
  const { data: classRow, error: classError } = await supabase
    .from("classes")
    .select("id, course_id, course:courses(id, display_name)")
    .eq("id", classId)
    .maybeSingle();
  if (classError || !classRow) {
    return NextResponse.json({ error: "Class not found." }, { status: 404 });
  }
  const course = classRow.course as unknown as { id: string; display_name: string };

  const canAccess = await hasCourseAccess(course.id);
  if (!canAccess) {
    return NextResponse.json({ error: "Subscribe to this course to use the bell ringer generator." }, { status: 403 });
  }

  let candidateTeks: { code: string; description: string }[] = [];

  if (mode === "spiral_review") {
    // Recently-touched TEKS for THIS class specifically (via its own
    // roster), not the course generally — spiral review means "what has
    // this class actually covered," same reasoning as the mastery
    // dashboard's per-class scoping.
    const { data: masteryRows } = await supabase
      .from("teks_mastery")
      .select("teks_code, last_updated, student:students!inner(class_id)")
      .eq("student.class_id", classId)
      .in("status", SPIRAL_REVIEW_STATUSES)
      .order("last_updated", { ascending: false });

    const codesInOrder: string[] = [];
    for (const row of masteryRows ?? []) {
      if (!codesInOrder.includes(row.teks_code)) codesInOrder.push(row.teks_code);
      if (codesInOrder.length >= SPIRAL_REVIEW_CANDIDATE_LIMIT) break;
    }

    if (codesInOrder.length === 0) {
      return NextResponse.json(
        { error: "No recently-covered TEKS found for this class yet — try a topic instead." },
        { status: 422 },
      );
    }

    const { data: teksRows } = await supabase
      .from("teks")
      .select("code, description")
      .in("code", codesInOrder);
    candidateTeks = teksRows ?? [];
  } else {
    let { data: subjectTeks } = await supabase
      .from("teks")
      .select("code, description")
      .eq("subject", course.display_name);
    if (!subjectTeks || subjectTeks.length === 0) {
      const { data: allTeks } = await supabase.from("teks").select("code, description");
      subjectTeks = allTeks ?? [];
    }
    candidateTeks = subjectTeks;
  }

  const result = await generateBellRinger({
    courseDisplayName: course.display_name,
    mode,
    topic,
    candidateTeks,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  const bellRinger = result.bellRinger;

  // Same belt-and-suspenders code -> id resolution as generate-lesson —
  // drop anything not actually in the candidate set rather than let the
  // teks_ids validation trigger reject the whole insert.
  let teksIds: string[] = [];
  if (bellRinger.teks_codes.length > 0) {
    const { data: matchedTeks } = await supabase
      .from("teks")
      .select("id, code")
      .in("code", bellRinger.teks_codes);
    teksIds = (matchedTeks ?? []).map((t) => t.id);
  }

  const { data: newBellRinger, error: insertError } = await supabase
    .from("bell_ringers")
    .insert({
      profile_id: user.id,
      course_id: course.id,
      title: bellRinger.title,
      topic: mode === "topic" ? (topic as string) : null,
      prompt_text: bellRinger.prompt_text,
      answer_key: bellRinger.answer_key,
      teks_ids: teksIds,
    })
    .select("id")
    .single();

  if (insertError || !newBellRinger) {
    console.error("generate-bell-ringer: failed to save", insertError);
    return NextResponse.json(
      { error: "Generated a bell ringer but couldn't save it. Try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ bellRingerId: newBellRinger.id });
}
