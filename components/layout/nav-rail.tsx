import Link from "next/link";

/**
 * Left-rail course/unit navigator.
 *
 * Deliberately built to feel like the index/spine of a bound planner —
 * a vertical strip of numbered tabs against a cream page, not a generic
 * hamburger sidebar. Sections below are placeholders; real nav (courses,
 * units, gradebook, etc.) lands with the curriculum/gradebook features.
 */

type NavSection = {
  label: string;
  href: string;
};

const NAV_SECTIONS: NavSection[] = [
  { label: "Dashboard", href: "/" },
  { label: "Curriculum", href: "#" },
  { label: "Assignments", href: "#" },
  { label: "Assessments", href: "#" },
  { label: "Gradebook", href: "#" },
  { label: "TEKS Mastery", href: "#" },
  { label: "Portfolios", href: "#" },
  { label: "Prep Checklist", href: "#" },
];

export function NavRail() {
  return (
    <nav
      aria-label="Primary"
      className="flex h-full w-full flex-col border-r border-rose-gold/40 bg-cream"
    >
      <div className="px-6 py-8">
        <span className="font-display text-2xl font-semibold leading-tight text-ink">
          Legacy
          <br />
          Command Center
        </span>
        <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.18em] text-slate">
          for Teachers
        </span>
      </div>

      <ol className="flex-1 overflow-y-auto px-3 pb-8">
        {NAV_SECTIONS.map((section, index) => (
          <li key={section.label} className="ledger-row">
            <Link
              href={section.href}
              className="flex items-center gap-3 rounded px-3 py-1.5 text-sm text-ink transition-colors hover:bg-rose-gold/10"
            >
              <span className="w-5 shrink-0 font-mono text-xs text-slate">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{section.label}</span>
            </Link>
          </li>
        ))}
      </ol>

      <div className="border-t border-rose-gold/40 px-6 py-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate">
          Foundation build
        </p>
      </div>
    </nav>
  );
}
