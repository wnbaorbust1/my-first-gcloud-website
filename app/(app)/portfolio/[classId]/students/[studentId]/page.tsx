import { notFound } from "next/navigation";
import Link from "next/link";
import { getClassWithStudents } from "@/lib/teacher/roster-queries";
import { getPortfolioItemsForStudent } from "@/lib/portfolio/queries";
import { getSignedFileUrl } from "@/lib/portfolio/storage";
import { getUnitsWithAssignments } from "@/lib/admin/assignment-queries";
import { hasCourseAccess } from "@/lib/billing/access";
import { Paywall } from "@/components/billing/paywall";
import { PortfolioItemRow } from "@/components/portfolio/portfolio-item-row";
import { AddPortfolioItemForm } from "@/components/portfolio/add-portfolio-item-form";

export default async function StudentPortfolioPage({
  params,
}: {
  params: { classId: string; studentId: string };
}) {
  const classDetail = await getClassWithStudents(params.classId);
  if (!classDetail) notFound();

  const student = classDetail.students.find((s) => s.id === params.studentId);
  if (!student) notFound();

  const backHref = `/portfolio/${params.classId}`;

  const canAccess = await hasCourseAccess(classDetail.course.id);
  if (!canAccess) {
    return (
      <div className="mx-auto max-w-3xl">
        <Link href={backHref} className="font-mono text-[11px] uppercase tracking-wide text-slate hover:text-ink">
          ← {classDetail.name}
        </Link>
        <div className="mt-8">
          <Paywall
            courseName={classDetail.course.display_name}
            message="Subscribe to this course to unlock student portfolios."
          />
        </div>
      </div>
    );
  }

  const [items, units] = await Promise.all([
    getPortfolioItemsForStudent(params.studentId),
    getUnitsWithAssignments(classDetail.course.id),
  ]);

  const itemsWithUrls = await Promise.all(
    items.map(async (item) => ({
      item,
      signedFileUrl:
        item.artifact_type === "file" && item.file_path ? await getSignedFileUrl(item.file_path) : null,
    })),
  );

  const assignmentOptions = units
    .flatMap((u) => u.assignments)
    .filter((a) => a.status === "published")
    .map((a) => ({ id: a.id, title: a.title }))
    .sort((a, b) => a.title.localeCompare(b.title));

  const thisPagePath = `${backHref}/students/${params.studentId}`;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={backHref} className="font-mono text-[11px] uppercase tracking-wide text-slate hover:text-ink">
        ← {classDetail.name}
      </Link>
      <div className="mt-3">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate">
          {classDetail.course.display_name}
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-ink">
          {student.name}
          <span className="text-rose-gold">.</span>
        </h1>
      </div>

      <AddPortfolioItemForm
        studentId={params.studentId}
        classId={params.classId}
        assignmentOptions={assignmentOptions}
        revalidatePaths={[thisPagePath, backHref]}
      />

      <section className="mt-8 mb-16">
        <h2 className="font-display text-2xl font-semibold text-ink">Portfolio</h2>
        {itemsWithUrls.length === 0 ? (
          <p className="mt-4 text-sm text-slate">Nothing added yet — use the form above.</p>
        ) : (
          <div className="mt-3 border-t border-rose-gold/40">
            {itemsWithUrls.map(({ item, signedFileUrl }) => (
              <PortfolioItemRow
                key={item.id}
                item={item}
                signedFileUrl={signedFileUrl}
                revalidatePaths={[thisPagePath, backHref]}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
