import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PortfolioItem } from "@/types/curriculum";

export type PortfolioItemWithAssignment = PortfolioItem & {
  assignment: { title: string } | null;
};

/** One student's full portfolio, newest first — the per-student ledger view. */
export async function getPortfolioItemsForStudent(
  studentId: string,
): Promise<PortfolioItemWithAssignment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("portfolio_items")
    .select("*, assignment:assignments(title)")
    .eq("student_id", studentId)
    .order("submitted_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getPortfolioItemsForStudent failed", error);
    return [];
  }
  return data as unknown as PortfolioItemWithAssignment[];
}

export type FeaturedPortfolioItem = PortfolioItemWithAssignment & {
  student: { id: string; name: string };
};

/** Featured items across every student in a class — the showcase view. */
export async function getFeaturedItemsForClass(classId: string): Promise<FeaturedPortfolioItem[]> {
  const supabase = createClient();
  // `!inner` makes the embedded `students` filter (class_id) actually
  // restrict the parent rows — a plain left-join embed can't be filtered
  // this way in PostgREST.
  const { data, error } = await supabase
    .from("portfolio_items")
    .select("*, assignment:assignments(title), student:students!inner(id, name, class_id)")
    .eq("student.class_id", classId)
    .eq("is_featured", true)
    .order("submitted_date", { ascending: false });

  if (error) {
    console.error("getFeaturedItemsForClass failed", error);
    return [];
  }
  return data as unknown as FeaturedPortfolioItem[];
}
