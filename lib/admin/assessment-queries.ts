import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Assessment, UnitWithAssessments } from "@/types/curriculum";

/**
 * Admin-side assessment reads, same posture as assignment-queries.ts:
 * these rely entirely on RLS (assessments_select's is_admin() branch)
 * for access — an admin session sees drafts and every variant.
 */

/** A course's units with their assessments, for the grouped list view. */
export async function getUnitsWithAssessments(courseId: string): Promise<UnitWithAssessments[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("units")
    .select("*, assessments(*)")
    .eq("course_id", courseId);

  if (error) {
    console.error("getUnitsWithAssessments failed", error);
    return [];
  }

  const units = data as UnitWithAssessments[];
  units.sort((a, b) => a.unit_number - b.unit_number);
  for (const unit of units) {
    // Originals first (alphabetical), each followed by its own variants —
    // keeps a retake/modified pair visually attached to its source rather
    // than sorted purely alphabetically by title.
    unit.assessments.sort((a, b) => {
      const aRoot = a.source_assessment_id ?? a.id;
      const bRoot = b.source_assessment_id ?? b.id;
      if (aRoot !== bRoot) {
        const aTitle = a.source_assessment_id
          ? (unit.assessments.find((x) => x.id === aRoot)?.title ?? a.title)
          : a.title;
        const bTitle = b.source_assessment_id
          ? (unit.assessments.find((x) => x.id === bRoot)?.title ?? b.title)
          : b.title;
        return aTitle.localeCompare(bTitle);
      }
      // Same family: original first, then retake/modified.
      return (a.variant_type === "original" ? 0 : 1) - (b.variant_type === "original" ? 0 : 1);
    });
  }

  return units;
}

export type AdminAssessmentDetail = Assessment & {
  unit: { id: string; unit_number: number; title: string };
  course: { id: string; slug: string; display_name: string };
  source_assessment: { id: string; title: string } | null;
};

/** Full assessment + its unit/course context, for the edit view and breadcrumbs. */
export async function getAssessmentById(assessmentId: string): Promise<AdminAssessmentDetail | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("assessments")
    .select(
      "*, unit:units(id, unit_number, title), course:courses(id, slug, display_name), source_assessment:source_assessment_id(id, title)",
    )
    .eq("id", assessmentId)
    .maybeSingle();

  if (error) {
    console.error("getAssessmentById failed", error);
    return null;
  }
  return data as unknown as AdminAssessmentDetail | null;
}
