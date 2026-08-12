import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * "WORKSHEET" VISUAL SYSTEM — the hand-drawn vision-board treatment for
 * the two outputs a member actually gets after finishing the quiz: the
 * Assessment Results page and the Blueprint Scorecard. Built from the
 * reference the business owner supplied (numbered panels, a script
 * headline, checklist rows, a crown/heart motif) — reusing Blueprint's
 * existing Legacy-purple/gold tokens rather than inventing a new
 * palette, and Caveat/Kalam (see layout.tsx) rather than the app's
 * standard Fraunces/Inter, since this is deliberately a different,
 * warmer register than the rest of the product chrome.
 */

export function WorksheetPage({ children }: { children: ReactNode }) {
  return (
    <div
      className="mx-auto max-w-3xl rounded-[28px] border-2 border-legacy-200 bg-cream-50 p-5 sm:p-8"
      style={{
        backgroundImage:
          "radial-gradient(var(--color-gold-200) 1px, transparent 1px)",
        backgroundSize: "16px 16px",
        backgroundPosition: "-8px -8px",
      }}
    >
      <div className="flex flex-col gap-5">{children}</div>
    </div>
  );
}

export function WorksheetHeader({
  name,
  subtitle,
}: {
  name: string;
  subtitle?: string;
}) {
  return (
    <header className="rounded-3xl border-2 border-dashed border-gold-300 bg-surface px-5 py-6 text-center sm:px-8">
      <p aria-hidden="true" className="text-2xl">
        👑
      </p>
      <h1 className="mt-1 font-script text-4xl leading-tight text-legacy-700 sm:text-5xl">
        {name}
      </h1>
      <p className="mt-2 font-hand text-lg text-gold-600 sm:text-xl">
        From Passion to Power to Legacy<sup className="text-sm">™</sup>
      </p>
      {subtitle && (
        <p className="mt-1 font-hand text-sm text-navy-500">{subtitle}</p>
      )}
    </header>
  );
}

export function WorksheetPanel({
  number,
  title,
  icon,
  children,
  className,
}: {
  number: number;
  title: string;
  icon?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-3xl border-2 border-legacy-200 bg-surface p-5 sm:p-6",
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-legacy-600 font-hand text-sm font-bold text-cream-50"
        >
          {number}
        </span>
        <h2 className="font-hand text-lg font-bold uppercase tracking-wide text-legacy-700">
          {icon && <span aria-hidden="true">{icon} </span>}
          {title}
        </h2>
      </div>
      <div className="mt-4 font-hand text-navy-800">{children}</div>
    </section>
  );
}

export function WorksheetChecklistItem({
  checked,
  children,
}: {
  checked: boolean;
  children: ReactNode;
}) {
  return (
    <li className="flex items-start gap-2.5 text-sm sm:text-base">
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2",
          checked
            ? "border-legacy-600 bg-legacy-600 text-cream-50"
            : "border-navy-300 bg-surface",
        )}
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden="true">
            <path
              d="M2 6.5 4.7 9 10 3"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span>{children}</span>
    </li>
  );
}

export function WorksheetChecklist({ children }: { children: ReactNode }) {
  return <ul className="flex flex-col gap-2.5">{children}</ul>;
}

/** A label + five circles filled left-to-right, like the reference's "PASSION ASSESSMENT" ratings — score is 0-100, mapped to a 1-5 fill. */
export function WorksheetRatingRow({
  label,
  scorePercent,
}: {
  label: string;
  scorePercent: number;
}) {
  const filled = Math.max(1, Math.min(5, Math.round(scorePercent / 20)));
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm sm:text-base">
      <span>{label}</span>
      <span className="flex shrink-0 gap-1" aria-label={`${filled} out of 5`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            aria-hidden="true"
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full border-2 text-[10px] font-bold",
              n <= filled
                ? "border-gold-500 bg-gold-400 text-legacy-800"
                : "border-navy-200 text-navy-300",
            )}
          >
            {n}
          </span>
        ))}
      </span>
    </div>
  );
}

export function WorksheetStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border-2 border-gold-200 bg-gold-50 px-3 py-4 text-center">
      <p className="font-hand text-xs font-bold uppercase tracking-wide text-gold-700">
        {label}
      </p>
      <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-legacy-700">
        {value}
      </p>
    </div>
  );
}
