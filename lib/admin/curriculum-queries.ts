import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Lesson, LessonSegment, Teks, Unit, Week } from "@/types/curriculum";

/**
 * Admin-side curriculum reads. These rely on the same RLS policies as the
 * teacher-facing queries in lib/curriculum/queries.ts — an admin session
 * simply sees everything (drafts included) because the policies'
 * `public.is_admin()` branch grants it, not because these functions do
 * anything special. Kept separate from the teacher queries because the
 * shapes differ (teachers get lazy per-week loads; the admin outline wants
 * the whole unit — units, weeks, and lessons — in one fetch so gaps and
 * drafts are visible at a glance).
 */

export type AdminWeek = Week & { lessons: Lesson[] };
export type AdminUnit = Unit & { weeks: AdminWeek[] };

export async function getCourseOutlineForAdmin(
  courseId: string,
): Promise<AdminUnit[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("units")
    .select("*, weeks(*, lessons(*))")
    .eq("course_id", courseId);

  if (error) {
    console.error("getCourseOutlineForAdmin failed", error);
    return [];
  }

  const units = data as AdminUnit[];

  // Sort client-side rather than relying on nested .order() at two embed
  // levels — simpler to get right than depth-2 PostgREST order syntax.
  units.sort((a, b) => a.unit_number - b.unit_number);
  for (const unit of units) {
    unit.weeks.sort((a, b) => a.week_number - b.week_number);
    for (const week of unit.weeks) {
      week.lessons.sort((a, b) => a.day_number - b.day_number);
    }
  }

  return units;
}

/** Resolve a week's id from the course-scoped week number the URLs use. */
export async function getWeekByNumber(
  courseId: string,
  weekNumber: number,
): Promise<{ id: string; title: string } | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("weeks")
    .select("id, title")
    .eq("course_id", courseId)
    .eq("week_number", weekNumber)
    .maybeSingle();

  if (error) {
    console.error("getWeekByNumber failed", error);
    return null;
  }
  return data;
}

export async function getAllTeks(): Promise<Teks[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("teks").select("*").order("code");

  if (error) {
    console.error("getAllTeks failed", error);
    return [];
  }
  return data;
}

export type AdminLessonDetail = Lesson & { segments: LessonSegment[] };

/** Full lesson + segments for the editor, regardless of status. */
export async function getLessonForEdit(
  weekId: string,
  dayNumber: number,
): Promise<AdminLessonDetail | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("lessons")
    .select("*, lesson_segments(*)")
    .eq("week_id", weekId)
    .eq("day_number", dayNumber)
    .maybeSingle();

  if (error) {
    console.error("getLessonForEdit failed", error);
    return null;
  }
  if (!data) return null;

  const { lesson_segments, ...lesson } = data as typeof data & {
    lesson_segments: LessonSegment[];
  };

  return { ...lesson, segments: lesson_segments };
}
