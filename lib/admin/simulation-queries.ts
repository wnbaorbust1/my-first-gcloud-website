import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { SimulationScenario } from "@/types/curriculum";

/** Every scenario for a course (drafts included — RLS's is_admin() branch grants that), newest first. */
export async function getScenariosForCourse(courseId: string): Promise<SimulationScenario[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("simulation_scenarios")
    .select("*")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getScenariosForCourse failed", error);
    return [];
  }
  return data;
}
