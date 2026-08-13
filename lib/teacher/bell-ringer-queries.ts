import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { BellRinger } from "@/types/curriculum";

/** A teacher's own bell ringers for one course, newest first — RLS (bell_ringers_all) already scopes this to their own rows. */
export async function getBellRingersForCourse(courseId: string): Promise<BellRinger[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bell_ringers")
    .select("*")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getBellRingersForCourse failed", error);
    return [];
  }
  return data;
}

export type BellRingerWithCourse = BellRinger & { course: { display_name: string } };

export async function getBellRingerById(id: string): Promise<BellRingerWithCourse | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bell_ringers")
    .select("*, course:courses(display_name)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("getBellRingerById failed", error);
    return null;
  }
  return data as unknown as BellRingerWithCourse;
}
