import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import type { PrepItem } from "@/types/curriculum";

/** This teacher's prep items for one lesson, oldest first. */
export async function getPrepItemsForLesson(lessonId: string): Promise<PrepItem[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("prep_items")
    .select("*")
    .eq("lesson_id", lessonId)
    .eq("profile_id", user.id)
    .order("created_at");

  if (error) {
    console.error("getPrepItemsForLesson failed", error);
    return [];
  }
  return data;
}

export type PrepItemWithLessonContext = PrepItem & {
  lesson: {
    id: string;
    title: string;
    day_number: number;
    week: { week_number: number; course: { slug: string; display_name: string } };
  };
};

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Sunday-through-Saturday range containing `reference` (defaults to today). */
export function getWeekRange(reference: Date = new Date()): { start: string; end: string } {
  const start = new Date(reference);
  start.setDate(reference.getDate() - reference.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: toIsoDate(start), end: toIsoDate(end) };
}

/**
 * Everything a teacher needs for the weekly prep dashboard: items overdue
 * (past due, not yet completed — surfaced separately so they don't get
 * lost) and items due within the current Sunday-Saturday week, across
 * every lesson. Both sets include already-completed items so the
 * checklist visibly fills in as the teacher works through it, rather
 * than items vanishing the moment they're checked off.
 */
export async function getPrepItemsDueThisWeek(): Promise<{
  overdue: PrepItemWithLessonContext[];
  thisWeek: PrepItemWithLessonContext[];
}> {
  const user = await getCurrentUser();
  if (!user) return { overdue: [], thisWeek: [] };

  const supabase = createClient();
  const { start, end } = getWeekRange();
  const today = toIsoDate(new Date());

  const selectClause =
    "*, lesson:lessons(id, title, day_number, week:weeks(week_number, course:courses(slug, display_name)))";

  const [overdueResult, thisWeekResult] = await Promise.all([
    supabase
      .from("prep_items")
      .select(selectClause)
      .eq("profile_id", user.id)
      .eq("completed", false)
      .lt("due_date", today)
      .not("due_date", "is", null)
      .order("due_date"),
    supabase
      .from("prep_items")
      .select(selectClause)
      .eq("profile_id", user.id)
      .gte("due_date", start)
      .lte("due_date", end)
      .order("due_date"),
  ]);

  if (overdueResult.error) console.error("getPrepItemsDueThisWeek overdue failed", overdueResult.error);
  if (thisWeekResult.error) console.error("getPrepItemsDueThisWeek thisWeek failed", thisWeekResult.error);

  return {
    overdue: (overdueResult.data ?? []) as unknown as PrepItemWithLessonContext[],
    thisWeek: (thisWeekResult.data ?? []) as unknown as PrepItemWithLessonContext[],
  };
}
