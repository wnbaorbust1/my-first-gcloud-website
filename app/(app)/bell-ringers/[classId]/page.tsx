import { notFound } from "next/navigation";
import Link from "next/link";
import { getClassWithStudents } from "@/lib/teacher/roster-queries";
import { getBellRingersForCourse } from "@/lib/teacher/bell-ringer-queries";
import { hasCourseAccess } from "@/lib/billing/access";
import { Paywall } from "@/components/billing/paywall";
import { BellRingerGenerateForm } from "@/components/teacher/bell-ringer-generate-form";
import { BellRingerHistoryRow } from "@/components/teacher/bell-ringer-history-row";

export default async function ClassBellRingersPage({ params }: { params: { classId: string } }) {
  const classDetail = await getClassWithStudents(params.classId);
  if (!classDetail) notFound();

  const backHref = "/bell-ringers";

  const canAccess = await hasCourseAccess(classDetail.course.id);
  if (!canAccess) {
    return (
      <div className="mx-auto max-w-3xl">
        <Link href={backHref} className="font-mono text-[11px] uppercase tracking-wide text-slate hover:text-ink">
          ← All classes
        </Link>
        <div className="mt-8">
          <Paywall
            courseName={classDetail.course.display_name}
            message="Subscribe to this course to use the bell ringer generator."
          />
        </div>
      </div>
    );
  }

  const bellRingers = await getBellRingersForCourse(classDetail.course.id);
  const thisPagePath = `${backHref}/${params.classId}`;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={backHref} className="font-mono text-[11px] uppercase tracking-wide text-slate hover:text-ink">
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

      <BellRingerGenerateForm classId={params.classId} />

      <section className="mt-8 mb-16">
        <h2 className="font-display text-2xl font-semibold text-ink">History</h2>
        <p className="mt-1 text-sm text-slate">
          Shared across every class you teach in {classDetail.course.display_name}.
        </p>
        {bellRingers.length === 0 ? (
          <p className="mt-4 text-sm text-slate">Nothing generated yet — use the form above.</p>
        ) : (
          <div className="mt-3 border-t border-rose-gold/40">
            {bellRingers.map((br) => (
              <BellRingerHistoryRow key={br.id} bellRinger={br} revalidatePaths={[thisPagePath]} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
