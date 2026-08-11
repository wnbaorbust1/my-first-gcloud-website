import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Assignment, UnitWithAssignments } from "@/types/curriculum";
import type { AssignmentType } from "@/types/supabase";

/**
 * Admin-side assignment reads, same posture as curriculum-queries.ts:
 * these rely entirely on RLS (an admin session sees drafts and published
 * alike because assignments_select's `is_admin()` branch grants it), not
 * on anything special these functions do.
 */

/**
 * A course's units with their assignments, for the grouped list view.
 * Optionally filtered to one assignment_type — filtering server-side
 * rather than fetching everything and filtering client-side, since a
 * course's full assignment set could get large over time.
 */
export async function getUnitsWithAssignments(
  courseId: string,
  assignmentType?: AssignmentType,
): Promise<UnitWithAssignments[]> {
  const supabase = createClient();

  let query = supabase
    .from("units")
    .select(
      assignmentType
        ? "*, assignments!inner(*)"
        : "*, assignments(*)",
    )
    .eq("course_id", courseId);

  if (assignmentType) {
    query = query.eq("assignments.assignment_type", assignmentType);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getUnitsWithAssignments failed", error);
    return [];
  }

  const units = data as UnitWithAssignments[];
  units.sort((a, b) => a.unit_number - b.unit_number);
  for (const unit of units) {
    unit.assignments.sort((a, b) => a.title.localeCompare(b.title));
  }

  return units;
}

/** Bare unit list for the generate form's unit picker — no assignments joined. */
export async function getUnitsForCourse(
  courseId: string,
): Promise<{ id: string; unit_number: number; title: string }[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("units")
    .select("id, unit_number, title")
    .eq("course_id", courseId)
    .order("unit_number");

  if (error) {
    console.error("getUnitsForCourse failed", error);
    return [];
  }
  return data;
}

export type AdminAssignmentDetail = Assignment & {
  unit: { id: string; unit_number: number; title: string };
  course: { id: string; slug: string; display_name: string };
};

/** Full assignment + its unit/course context, for the edit view and breadcrumbs. */
export async function getAssignmentById(
  assignmentId: string,
): Promise<AdminAssignmentDetail | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("assignments")
    .select("*, unit:units(id, unit_number, title), course:courses(id, slug, display_name)")
    .eq("id", assignmentId)
    .maybeSingle();

  if (error) {
    console.error("getAssignmentById failed", error);
    return null;
  }
  return data as AdminAssignmentDetail | null;
}
