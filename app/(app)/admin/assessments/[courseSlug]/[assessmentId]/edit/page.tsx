import { notFound } from "next/navigation";
import { getAssessmentById } from "@/lib/admin/assessment-queries";
import { getAllTeks } from "@/lib/admin/curriculum-queries";
import { AssessmentEditorForm } from "@/components/admin/assessment-editor-form";

export default async function EditAssessmentPage({
  params,
}: {
  params: { courseSlug: string; assessmentId: string };
}) {
  const [assessment, allTeks] = await Promise.all([
    getAssessmentById(params.assessmentId),
    getAllTeks(),
  ]);
  if (!assessment || assessment.course.slug !== params.courseSlug) notFound();

  return <AssessmentEditorForm assessment={assessment} courseSlug={params.courseSlug} allTeks={allTeks} />;
}
