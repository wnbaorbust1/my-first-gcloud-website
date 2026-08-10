import "server-only";
import { createClient } from "@/lib/supabase/server";
import { SEGMENT_ORDER } from "@/lib/curriculum/constants";
import type {
  Course,
  LessonDetail,
  LessonSegment,
  UnitWithWeeks,
  WeekWithLessons,
} from "@/types/curriculum";

/**
 * Every function here relies entirely on RLS for access control — no
 * manual "is this published / does the teacher have access" filtering in
 * application code. A teacher without an active subscription for a course
 * simply gets an empty `lessons` array back, indistinguishable from the
 * course having no lessons yet. That's intentional: it doesn't leak
 * whether content exists behind the paywall.
 */

export async function getCourseBySlug(slug: string): Promise<Course | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("getCourseBySlug failed", error);
    return null;
  }
  return data;
}

export async function getAllCourses(): Promise<Course[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .order("sort_order");

  if (error) {
    console.error("getAllCourses failed", error);
    return [];
  }
  return data;
}

/** A course's full unit → week outline, for the curriculum spine nav. */
export async function getCourseUnitsWithWeeks(
  courseId: string,
): Promise<UnitWithWeeks[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("units")
    .select("*, weeks(*)")
    .eq("course_id", courseId)
    .order("unit_number")
    .order("week_number", { referencedTable: "weeks" });

  if (error) {
    console.error("getCourseUnitsWithWeeks failed", error);
    return [];
  }
  return data as UnitWithWeeks[];
}

/**
 * A single week (by the course-scoped week_number) and its lessons,
 * ordered Monday → Friday. Lessons a teacher can't access (draft, or
 * outside their subscription) are simply absent — RLS, not app logic.
 */
export async function getWeekWithLessons(
  courseId: string,
  weekNumber: number,
): Promise<WeekWithLessons | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("weeks")
    .select("*, lessons(*)")
    .eq("course_id", courseId)
    .eq("week_number", weekNumber)
    .order("day_number", { referencedTable: "lessons" })
    .maybeSingle();

  if (error) {
    console.error("getWeekWithLessons failed", error);
    return null;
  }
  return data as WeekWithLessons | null;
}

/** A single lesson's full detail: segments (bell-to-bell order) + resolved TEKS rows. */
export async function getLessonDetail(
  courseId: string,
  weekNumber: number,
  dayNumber: number,
): Promise<LessonDetail | null> {
  const supabase = createClient();

  // Two queries rather than one filtered-through-a-join: the URL's natural
  // key is (course, week number, day number), but lessons are keyed by
  // week_id — resolve the week first, then the lesson under it.
  const { data: week, error: weekError } = await supabase
    .from("weeks")
    .select("id")
    .eq("course_id", courseId)
    .eq("week_number", weekNumber)
    .maybeSingle();

  if (weekError) {
    console.error("getLessonDetail week lookup failed", weekError);
    return null;
  }
  if (!week) return null;

  const { data: lesson, error } = await supabase
    .from("lessons")
    .select("*, lesson_segments(*)")
    .eq("week_id", week.id)
    .eq("day_number", dayNumber)
    .maybeSingle();

  if (error) {
    console.error("getLessonDetail failed", error);
    return null;
  }
  if (!lesson) return null;

  const { lesson_segments, ...lessonFields } = lesson as typeof lesson & {
    lesson_segments: LessonSegment[];
  };

  const segments = [...lesson_segments].sort(
    (a, b) => SEGMENT_ORDER.indexOf(a.segment_key) - SEGMENT_ORDER.indexOf(b.segment_key),
  );

  let teks: LessonDetail["teks"] = [];
  if (lessonFields.teks_ids.length > 0) {
    const { data: teksRows, error: teksError } = await supabase
      .from("teks")
      .select("*")
      .in("id", lessonFields.teks_ids);

    if (teksError) {
      console.error("getLessonDetail teks lookup failed", teksError);
    } else {
      teks = teksRows;
    }
  }

  return { ...lessonFields, segments, teks };
}
