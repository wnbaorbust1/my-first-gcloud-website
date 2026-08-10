"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { UnitWithWeeks } from "@/types/curriculum";

/**
 * Secondary, course-scoped planner spine — nested inside the main
 * NavRail's "Curriculum" section, listing this course's units → weeks.
 * Reuses the Ledger Line motif (a rule under every week row) rather than
 * introducing a different nav pattern for this one section.
 */
export function CurriculumSpine({
  courseSlug,
  units,
}: {
  courseSlug: string;
  units: UnitWithWeeks[];
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Course outline" className="flex w-full flex-col">
      <Link
        href="/curriculum"
        className="mb-4 font-mono text-[11px] uppercase tracking-wide text-slate hover:text-ink"
      >
        ← All courses
      </Link>

      {units.length === 0 && (
        <p className="text-sm text-slate">No units published for this course yet.</p>
      )}

      {units.map((unit) => (
        <div key={unit.id} className="pb-5">
          <p className="font-display text-lg font-semibold text-ink">
            Unit {unit.unit_number}: {unit.title}
          </p>
          {unit.teks_focus_summary && (
            <p className="mt-0.5 text-xs text-slate">{unit.teks_focus_summary}</p>
          )}

          <div className="mt-2">
            {unit.weeks.map((week) => {
              const href = `/curriculum/${courseSlug}/${week.week_number}`;
              const isActive = pathname === href || pathname.startsWith(`${href}/`);

              return (
                <div key={week.id} className="ledger-row">
                  <Link
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded px-2 py-1 text-sm transition-colors hover:bg-rose-gold/10",
                      isActive ? "text-ink font-medium" : "text-slate",
                    )}
                  >
                    <span className="w-8 shrink-0 font-mono text-xs">
                      Wk {week.week_number}
                    </span>
                    <span>{week.title}</span>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
