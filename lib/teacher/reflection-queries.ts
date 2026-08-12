import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import type { Reflection } from "@/types/curriculum";

/** This teacher's reflection for one lesson, or null if they haven't
 * written one yet. Powers the quick-entry form's initial state. */
export async function getReflectionForLesson(lessonId: string): Promise<Reflection | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("reflections")
    .select("*")
    .eq("lesson_id", lessonId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("getReflectionForLesson failed", error);
    return null;
  }
  return data;
}

export type ReflectionWithLessonContext = Reflection & {
  lesson: {
    id: string;
    title: string;
    day_number: number;
    week: { week_number: number; course: { slug: string; display_name: string } };
  };
};

/** This teacher's reflections, optionally favorites-only, newest first —
 * the /reflections list. Joined through to the lesson/week/course so
 * each row can link straight back to it. */
export async function getReflectionsForTeacher(
  favoritesOnly: boolean,
): Promise<ReflectionWithLessonContext[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = createClient();
  let query = supabase
    .from("reflections")
    .select(
      "*, lesson:lessons(id, title, day_number, week:weeks(week_number, course:courses(slug, display_name)))",
    )
    .eq("profile_id", user.id)
    .order("updated_at", { ascending: false });

  if (favoritesOnly) {
    query = query.eq("is_favorite", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getReflectionsForTeacher failed", error);
    return [];
  }
  return data as unknown as ReflectionWithLessonContext[];
}
