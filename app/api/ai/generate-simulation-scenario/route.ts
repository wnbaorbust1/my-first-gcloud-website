import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAdminProfile } from "@/lib/auth/session";
import { generateSimulationScenario } from "@/lib/ai/generate-simulation-scenario";

export const maxDuration = 120;

const requestSchema = z.object({
  courseId: z.string().uuid(),
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
  const { courseId, topic, notes } = parsed.data;

  const supabase = createClient();

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, slug, display_name")
    .eq("id", courseId)
    .maybeSingle();
  if (courseError || !course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  let { data: candidateTeks } = await supabase
    .from("teks")
    .select("code, description")
    .eq("subject", course.display_name);
  if (!candidateTeks || candidateTeks.length === 0) {
    const { data: allTeks } = await supabase.from("teks").select("code, description");
    candidateTeks = allTeks ?? [];
  }

  const result = await generateSimulationScenario({
    courseDisplayName: course.display_name,
    topic,
    notes,
    candidateTeks,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  const scenario = result.scenario;

  let teksIds: string[] = [];
  if (scenario.teks_codes.length > 0) {
    const { data: matchedTeks } = await supabase
      .from("teks")
      .select("id, code")
      .in("code", scenario.teks_codes);
    teksIds = (matchedTeks ?? []).map((t) => t.id);
  }

  const { data: newScenario, error: insertError } = await supabase
    .from("simulation_scenarios")
    .insert({
      course_id: courseId,
      title: scenario.title,
      starting_income: scenario.starting_income,
      fixed_expenses: scenario.fixed_expenses,
      event_deck: scenario.event_deck,
      teks_ids: teksIds,
    })
    .select("id")
    .single();

  if (insertError || !newScenario) {
    console.error("generate-simulation-scenario: failed to save", insertError);
    return NextResponse.json(
      { error: "Generated a scenario but couldn't save it. Try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ scenarioId: newScenario.id, courseSlug: course.slug });
}
