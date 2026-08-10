import { LedgerRow } from "@/components/ui/ledger-row";
import { StatusStamp } from "@/components/ui/status-stamp";
import { CourseTag, type CourseSlug } from "@/components/ui/course-tag";

const SAMPLE_ROWS: {
  label: string;
  course: CourseSlug;
  date: string;
  mastered: boolean;
}[] = [
  {
    label: "Unit 3.2 — Compound Interest",
    course: "money-matters",
    date: "Aug 18",
    mastered: true,
  },
  {
    label: "TEKS 111.39(c)(6)(A)",
    course: "algebra-1",
    date: "Aug 20",
    mastered: true,
  },
  {
    label: "Lab: Cellular Respiration",
    course: "biology",
    date: "Aug 22",
    mastered: false,
  },
  {
    label: "Essay: Rhetorical Analysis",
    course: "english-1",
    date: "Aug 25",
    mastered: false,
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate">
        Foundation preview
      </p>
      <h1 className="mt-2 font-display text-5xl font-semibold text-ink">
        Legacy Command Center
        <span className="text-rose-gold">.</span>
      </h1>
      <p className="mt-4 max-w-xl text-base text-slate">
        This is the clean skeleton — brand fonts, colors, and the ledger-line
        motif wired up. No auth, data, or features yet: just the frame the
        rest of the app will be built on, phase by phase.
      </p>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Ledger line
        </h2>
        <p className="mt-1 text-sm text-slate">
          Every list/table row in the app — lessons, TEKS rows, gradebook
          rows, portfolio items — uses this rule instead of a card.
        </p>

        <div className="mt-4">
          {SAMPLE_ROWS.map((row) => (
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

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="border border-rose-gold/40 p-5">
          <p className="font-mono text-[11px] uppercase tracking-wide text-slate">
            Data / utility
          </p>
          <p className="mt-2 font-mono text-2xl text-ink">92.4%</p>
          <p className="font-mono text-xs text-slate">
            TEKS 111.39(c)(6)(A) — Section 3
          </p>
        </div>
        <div className="border border-rose-gold/40 p-5">
          <p className="font-mono text-[11px] uppercase tracking-wide text-slate">
            Heading type
          </p>
          <p className="mt-2 font-display text-3xl font-semibold text-ink">
            Cormorant Garamond
          </p>
          <p className="text-sm text-slate">
            Restrained — headers and key numbers only.
          </p>
        </div>
      </section>
    </div>
  );
}
