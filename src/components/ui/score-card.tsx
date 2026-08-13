import { Card } from "@/components/ui/card";
import { cn, STAGE_META, type Stage } from "@/lib/utils";

const RING_STROKE: Record<Stage, string> = {
  PASSION: "stroke-passion-400",
  POWER: "stroke-power-400",
  LEGACY: "stroke-legacy-400",
};

interface ScoreCardProps {
  stage: Stage;
  /** 0–100, or null if no assessment score exists yet. */
  scorePercent: number | null;
  statusLabel?: string;
  className?: string;
}

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** A stage progress ring (Passion / Power / Legacy) — the Results-page score card. */
export function ScoreCard({
  stage,
  scorePercent,
  statusLabel,
  className,
}: ScoreCardProps) {
  const meta = STAGE_META[stage];
  const value = scorePercent ?? 0;
  const offset = CIRCUMFERENCE - (value / 100) * CIRCUMFERENCE;

  return (
    <Card className={cn("flex flex-col items-center text-center", className)}>
      <div className="relative flex h-32 w-32 items-center justify-center">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            strokeWidth="9"
            className="stroke-navy-100"
          />
          {scorePercent !== null && (
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              className={cn("transition-[stroke-dashoffset] duration-700 ease-out", RING_STROKE[stage])}
            />
          )}
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl" aria-hidden="true">
            {meta.icon}
          </span>
          <span className="text-xl font-semibold tabular-nums text-navy-900">
            {scorePercent !== null ? `${scorePercent}%` : "—"}
          </span>
        </div>
      </div>
      <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-navy-800">
        {meta.label}
      </p>
      {statusLabel && (
        <p className="mt-0.5 text-xs text-foreground-muted">{statusLabel}</p>
      )}
    </Card>
  );
}
