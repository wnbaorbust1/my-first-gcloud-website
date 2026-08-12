import { notFound } from "next/navigation";
import Link from "next/link";
import { getClassWithStudents } from "@/lib/teacher/roster-queries";
import { getFeaturedItemsForClass } from "@/lib/portfolio/queries";
import { getSignedFileUrl } from "@/lib/portfolio/storage";
import { hasCourseAccess } from "@/lib/billing/access";
import { Paywall } from "@/components/billing/paywall";
import { LedgerRow } from "@/components/ui/ledger-row";
import { PortfolioItemRow } from "@/components/portfolio/portfolio-item-row";

export default async function ClassPortfolioPage({ params }: { params: { classId: string } }) {
  const classDetail = await getClassWithStudents(params.classId);
  if (!classDetail) notFound();

  // Roster reads aren't RLS-gated by subscription (same situation as the
  // gradebook's [classId] page) — the app layer is the only gate here.
  const canAccess = await hasCourseAccess(classDetail.course.id);
  if (!canAccess) {
    return (
      <div className="mx-auto max-w-3xl">
        <Link href="/portfolio" className="font-mono text-[11px] uppercase tracking-wide text-slate hover:text-ink">
          ← All classes
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

  const featured = await getFeaturedItemsForClass(params.classId);
  const featuredWithUrls = await Promise.all(
    featured.map(async (item) => ({
      item,
      signedFileUrl: item.artifact_type === "file" && item.file_path ? await getSignedFileUrl(item.file_path) : null,
    })),
  );

  const thisPagePath = `/portfolio/${params.classId}`;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/portfolio" className="font-mono text-[11px] uppercase tracking-wide text-slate hover:text-ink">
        ← All classes
      </Link>
      <div className="mt-3">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate">
          {classDetail.course.display_name}
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-ink">
          {classDetail.name}
          <span className="text-rose-gold">.</span>
        </h1>
      </div>

      {featuredWithUrls.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-2xl font-semibold text-ink">Showcase</h2>
          <p className="mt-1 text-sm text-slate">Featured work from across this class.</p>
          <div className="mt-3 border-t border-rose-gold/40">
            {featuredWithUrls.map(({ item, signedFileUrl }) => (
              <PortfolioItemRow
                key={item.id}
                item={item}
                signedFileUrl={signedFileUrl}
                studentName={item.student.name}
                revalidatePaths={[thisPagePath]}
              />
            ))}
          </div>
        </section>
      )}

      <section className="mt-8 mb-16">
        <h2 className="font-display text-2xl font-semibold text-ink">Roster</h2>
        {classDetail.students.length === 0 ? (
          <p className="mt-4 text-sm text-slate">
            No students yet — add them from the Gradebook or TEKS Mastery roster.
          </p>
        ) : (
          <div className="mt-3 border-t border-rose-gold/40">
            {classDetail.students.map((student) => (
              <LedgerRow key={student.id}>
                <Link href={`/portfolio/${params.classId}/students/${student.id}`} className="hover:underline">
                  {student.name}
                </Link>
              </LedgerRow>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
