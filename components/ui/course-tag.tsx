import { cn } from "@/lib/utils";

/**
 * Course accent tags. Each of the 8 subjects has one unique accent hue,
 * used only here (a small tag/icon) — never as a full background.
 */
export const COURSE_ACCENTS = {
  "money-matters": { label: "Money Matters", var: "--accent-money-matters" },
  "dollars-and-sense": {
    label: "Dollars & Sense",
    var: "--accent-dollars-and-sense",
  },
  "algebra-1": { label: "Algebra I", var: "--accent-algebra-1" },
  biology: { label: "Biology", var: "--accent-biology" },
  "english-1": { label: "English I", var: "--accent-english-1" },
  "us-history": { label: "US History", var: "--accent-us-history" },
  "accounting-1": { label: "Accounting I", var: "--accent-accounting-1" },
  "accounting-2": { label: "Accounting II", var: "--accent-accounting-2" },
} as const;

export type CourseSlug = keyof typeof COURSE_ACCENTS;

export function CourseTag({
  course,
  className,
}: {
  course: CourseSlug;
  className?: string;
}) {
  const accent = COURSE_ACCENTS[course];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide",
        className,
      )}
      style={{ color: `var(${accent.var})` }}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: `var(${accent.var})` }}
      />
      {accent.label}
    </span>
  );
}
