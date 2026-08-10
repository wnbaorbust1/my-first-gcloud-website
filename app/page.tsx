import Link from "next/link";
import { LedgerRow } from "@/components/ui/ledger-row";
import { StatusStamp } from "@/components/ui/status-stamp";
import { CourseTag, type CourseSlug } from "@/components/ui/course-tag";

const PREVIEW_ROWS: { label: string; course: CourseSlug; date: string; mastered: boolean }[] = [
  { label: "Unit 3.2 — Compound Interest", course: "money-matters", date: "Aug 18", mastered: true },
  { label: "TEKS 111.39(c)(6)(A)", course: "algebra-1", date: "Aug 20", mastered: true },
  { label: "Lab: Cellular Respiration", course: "biology", date: "Aug 22", mastered: false },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-cream">
      <header className="flex items-center justify-between px-4 py-5 sm:px-8">
        <span className="font-display text-xl font-semibold text-ink">
          Legacy Command Center
        </span>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/login" className="text-ink hover:underline">
            Sign in
          </Link>
          <Link href="/signup" className="border border-ink px-4 py-1.5 text-ink hover:bg-ink hover:text-cream">
            Sign up
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate">
          For high school teachers
        </p>
        <h1 className="mt-2 font-display text-5xl font-semibold text-ink">
          Legacy Command Center
          <span className="text-rose-gold">.</span>
        </h1>
        <p className="mt-4 max-w-xl text-base text-slate">
          AI-generated, TEKS-aligned lesson plans, assignments, assessments, a gradebook, and
          mastery tracking — across 8 subjects, built for how you actually plan a year.
        </p>

        <div className="mt-8 flex gap-3">
          <Link href="/signup" className="bg-ink px-5 py-2.5 text-sm font-medium text-cream hover:opacity-90">
            Get started
          </Link>
          <Link href="/login" className="border border-slate/40 px-5 py-2.5 text-sm font-medium text-ink hover:bg-rose-gold/10">
            Sign in
          </Link>
        </div>

        <section className="mt-14">
          <h2 className="font-display text-2xl font-semibold text-ink">A gradebook, not a template</h2>
          <p className="mt-1 text-sm text-slate">
            Every lesson, TEKS row, and gradebook entry gets the same hand-ruled line — a
            grade book, not another generic dashboard.
          </p>
          <div className="mt-4 border border-rose-gold/40 px-4">
            {PREVIEW_ROWS.map((row) => (
              <LedgerRow
                key={row.label}
                stamp={row.mastered ? <StatusStamp label="Mastered" /> : null}
                meta={row.date}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>{row.label}</span>
                  <CourseTag course={row.course} />
                </div>
              </LedgerRow>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
