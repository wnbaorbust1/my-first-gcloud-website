import { notFound } from "next/navigation";
import { getAssignmentById } from "@/lib/admin/assignment-queries";
import { AssignmentEditorForm } from "@/components/admin/assignment-editor-form";

export default async function EditAssignmentPage({
  params,
}: {
  params: { courseSlug: string; assignmentId: string };
}) {
  const assignment = await getAssignmentById(params.assignmentId);
  if (!assignment || assignment.course.slug !== params.courseSlug) notFound();

  return <AssignmentEditorForm assignment={assignment} courseSlug={params.courseSlug} />;
}
