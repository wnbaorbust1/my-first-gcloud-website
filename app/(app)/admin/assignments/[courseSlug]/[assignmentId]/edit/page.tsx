import { notFound } from "next/navigation";
import { getAssignmentById } from "@/lib/admin/assignment-queries";
import { getAllTeks } from "@/lib/admin/curriculum-queries";
import { AssignmentEditorForm } from "@/components/admin/assignment-editor-form";

export default async function EditAssignmentPage({
  params,
}: {
  params: { courseSlug: string; assignmentId: string };
}) {
  const [assignment, allTeks] = await Promise.all([
    getAssignmentById(params.assignmentId),
    getAllTeks(),
  ]);
  if (!assignment || assignment.course.slug !== params.courseSlug) notFound();

  return <AssignmentEditorForm assignment={assignment} courseSlug={params.courseSlug} allTeks={allTeks} />;
}
