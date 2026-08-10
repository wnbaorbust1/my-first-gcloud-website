import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAdminProfile } from "@/lib/auth/session";
import { fillCurriculumGaps } from "@/lib/ai/fill-gaps";

export const maxDuration = 120;

const requestSchema = z.object({
  unitId: z.string().uuid(),
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

  const supabase = createClient();

  const { data: unit, error: unitError } = await supabase
    .from("units")
    .select("id, title, teks_focus_summary, course_id")
    .eq("id", parsed.data.unitId)
    .maybeSingle();
  if (unitError || !unit) {
    return NextResponse.json({ error: "Unit not found." }, { status: 404 });
  }

  const { data: course } = await supabase
    .from("courses")
    .select("display_name")
    .eq("id", unit.course_id)
    .maybeSingle();

  const { data: weeks, error: weeksError } = await supabase
    .from("weeks")
    .select("id, week_number, title, lessons(day_number, title)")
    .eq("unit_id", unit.id);

  if (weeksError || !weeks) {
    return NextResponse.json({ error: "Couldn't load this unit's weeks." }, { status: 500 });
  }

  const weeksInput = weeks
    .map((week) => ({
      weekNumber: week.week_number,
      title: week.title,
      existingLessons: week.lessons as { day_number: number; title: string }[],
    }))
    .sort((a, b) => a.weekNumber - b.weekNumber);

  const emptySlots: { weekNumber: number; dayNumber: number }[] = [];
  for (const week of weeksInput) {
    const filledDays = new Set(week.existingLessons.map((l) => l.day_number));
    for (let day = 1; day <= 5; day++) {
      if (!filledDays.has(day)) emptySlots.push({ weekNumber: week.weekNumber, dayNumber: day });
    }
  }

  if (emptySlots.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  const result = await fillCurriculumGaps({
    courseDisplayName: course?.display_name ?? "this course",
    unitTitle: unit.title,
    unitTeksFocusSummary: unit.teks_focus_summary,
    weeks: weeksInput.map((w) => ({
      weekNumber: w.weekNumber,
      title: w.title,
      existingLessons: w.existingLessons.map((l) => ({
        dayNumber: l.day_number,
        title: l.title,
      })),
    })),
    emptySlots,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ suggestions: result.suggestions });
}
