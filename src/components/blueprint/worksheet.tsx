import type { ReactNode } from "react";

import { cn, STAGE_META, STAGES, type Stage } from "@/lib/utils";

/**
 * "WORKSHEET" VISUAL SYSTEM — the hand-drawn vision-board treatment for
 * the two outputs a member actually gets after finishing the quiz: the
 * Assessment Results page and the Blueprint Scorecard. Built from the
 * reference the business owner supplied: a dense, poster-style grid of
 * small numbered panels (not a single stacked column), a script
 * headline, checklist rows, 1-5 rating dots, and a closing dark banner
 * — reusing Blueprint's existing Legacy-purple/gold tokens rather than
 * inventing a new palette, and Caveat/Kalam (see layout.tsx) rather
 * than the app's standard Fraunces/Inter, since this is deliberately a
 * different, warmer register than the rest of the product chrome.
 */

export function WorksheetPage({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative mx-auto max-w-4xl overflow-hidden rounded-[28px] border-2 border-legacy-200 bg-cream-50 p-4 sm:p-7"
      style={{
        backgroundImage:
          "radial-gradient(var(--color-gold-200) 1px, transparent 1px)",
        backgroundSize: "16px 16px",
        backgroundPosition: "-8px -8px",
      }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-3 -top-3 text-6xl opacity-10 sm:text-8xl"
      >
        👑
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-4 -left-3 text-5xl opacity-10 sm:text-7xl"
      >
        💗
      </span>
      <div className="relative flex flex-col gap-4">{children}</div>
    </div>
  );
}

export function WorksheetHeader({
  name,
  eyebrow,
  subtitle,
}: {
  name: string;
  eyebrow?: string;
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
      {eyebrow && (
        <p className="mt-1 font-hand text-xs font-bold uppercase tracking-[0.15em] text-navy-500 sm:text-sm">
          {eyebrow}
        </p>
      )}
      <p className="mt-2 font-hand text-lg text-gold-600 sm:text-xl">
        From Passion to Power to Legacy<sup className="text-sm">™</sup>
      </p>
      {subtitle && (
        <p className="mt-1 font-hand text-sm text-navy-500">{subtitle}</p>
      )}
    </header>
  );
}

const ROADMAP_NODE_CLASSES: Record<Stage, { border: string; bg: string; text: string; ring: string }> = {
  PASSION: { border: "border-passion-300", bg: "bg-passion-50", text: "text-passion-700", ring: "ring-passion-400" },
  POWER: { border: "border-power-300", bg: "bg-power-50", text: "text-power-700", ring: "ring-power-400" },
  LEGACY: { border: "border-legacy-300", bg: "bg-legacy-50", text: "text-legacy-700", ring: "ring-legacy-400" },
};

/**
 * PASSION → POWER → LEGACY ROADMAP — the board's centerpiece (Phase 4:
 * Board Template directive — "no portrait or human images... Passion →
 * Power → Legacy roadmap in the center"). Real webpage text/HTML the
 * whole way down, driven entirely by the member's own assessment scores
 * and the scoring engine's actual recommendation
 * (src/lib/assessment/scoring.ts) — never a generated image, never a
 * decorative or invented score. The node matching the business's real
 * next-recommended stage gets a gold "Current Focus" crown; when the
 * scoring engine finds all three stages already strong
 * (RecommendedSessionType "GROWTH" — see determineRecommendation), every
 * node is marked on track instead of guessing which single one to
 * spotlight.
 */
export function WorksheetRoadmap({
  scores,
  focusStage,
}: {
  /** 0-100, or null when no completed assessment exists yet — real scores only, never invented. */
  scores: Record<Stage, number | null>;
  /** The scoring engine's actual next-recommended stage, "GROWTH" when all three already clear threshold, or null pre-assessment. */
  focusStage: Stage | "GROWTH" | null;
}) {
  return (
    <div className="rounded-3xl border-2 border-legacy-300 bg-surface px-5 py-6 text-center sm:px-8">
      <p className="font-hand text-xs font-bold uppercase tracking-[0.2em] text-gold-700 sm:text-sm">
        My Roadmap
      </p>
      <h2 className="mt-1 font-script text-3xl leading-tight text-legacy-700 sm:text-4xl">
        &ldquo;I Build What Outlives Me&rdquo;
      </h2>

      <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-3">
        {STAGES.map((stage, i) => {
          const meta = STAGE_META[stage];
          const classes = ROADMAP_NODE_CLASSES[stage];
          const isCurrent = focusStage === stage || focusStage === "GROWTH";
          const score = scores[stage];
          return (
            <div key={stage} className="flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
              <div
                className={cn(
                  "relative flex w-40 flex-col items-center gap-1 rounded-2xl border-2 px-4 py-3",
                  classes.border,
                  classes.bg,
                  isCurrent && "ring-4 ring-offset-2 ring-offset-cream-50",
                  isCurrent && classes.ring,
                )}
              >
                {isCurrent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-gold-400 bg-gold-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold-700">
                    👑 {focusStage === "GROWTH" ? "On Track" : "Current Focus"}
                  </span>
                )}
                <span aria-hidden="true" className="text-2xl">
                  {meta.icon}
                </span>
                <span className={cn("font-hand text-base font-bold uppercase tracking-wide", classes.text)}>
                  {meta.label}
                </span>
                <span className="font-display text-xl font-semibold tabular-nums text-navy-900">
                  {score !== null ? `${score}%` : "—"}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <span aria-hidden="true" className="font-hand text-2xl font-bold text-gold-500">
                  <span className="sm:hidden">↓</span>
                  <span className="hidden sm:inline">→</span>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Bento-style grid — the reference packs many small panels side by side rather than stacking full-width cards. */
export function WorksheetGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
  );
}

export function WorksheetPanel({
  number,
  title,
  icon,
  children,
  className,
  span,
  badge,
}: {
  number: number;
  title: string;
  icon?: string;
  children: ReactNode;
  className?: string;
  /** Take the full grid width instead of one column — for a wide/feature panel. */
  span?: "full";
  /** Small pill next to the title — e.g. an "AI Suggested" provenance marker (Phase 3: AI Blueprint Generator). */
  badge?: ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-3xl border-2 border-legacy-200 bg-surface p-4 sm:p-5",
        span === "full" && "sm:col-span-2",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          aria-hidden="true"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-legacy-600 font-hand text-xs font-bold text-cream-50"
        >
          {number}
        </span>
        <h2 className="font-hand text-base font-bold uppercase tracking-wide text-legacy-700 sm:text-lg">
          {icon && <span aria-hidden="true">{icon} </span>}
          {title}
        </h2>
        {badge}
      </div>
      <div className="mt-3 font-hand text-sm text-navy-800 sm:text-base">{children}</div>
    </section>
  );
}

/** "AI Suggested" provenance pill (Phase 3: AI Blueprint Generator — "mark AI-generated recommendations clearly"). */
export function AiSuggestedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-navy-200 bg-navy-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy-600">
      ✨ AI Suggested
    </span>
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
  return <ul className="flex flex-col gap-2">{children}</ul>;
}

/** A small pill tag — like the reference's "MY VIBES" chip list (Ambitious, Passionate, ...). */
export function WorksheetChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border-2 border-gold-300 bg-gold-50 px-2.5 py-0.5 text-xs font-bold text-legacy-700">
      {children}
    </span>
  );
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
    <div className="flex flex-col items-center rounded-2xl border-2 border-gold-200 bg-gold-50 px-3 py-3 text-center">
      <p className="font-hand text-xs font-bold uppercase tracking-wide text-gold-700">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-legacy-700 sm:text-3xl">
        {value}
      </p>
    </div>
  );
}

/** Closing dark banner — the reference's bottom black band with the org's tagline. */
export function WorksheetBanner({ businessName }: { businessName: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-navy-900 px-5 py-3 text-center sm:text-left">
      <p className="font-hand text-xs font-bold uppercase tracking-[0.15em] text-gold-400 sm:text-sm">
        &ldquo;I build with purpose.&rdquo; 💗
      </p>
      <p className="font-hand text-xs font-bold uppercase tracking-[0.1em] text-cream-100 sm:text-sm">
        👑 {businessName}
      </p>
      <p className="font-hand text-xs font-bold uppercase tracking-[0.15em] text-gold-400 sm:text-sm">
        My Blueprint. My Future. My Legacy. 💗
      </p>
    </div>
  );
}
