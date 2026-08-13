import type { Stage } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STAGE_BAR_COLOR: Record<Stage, string> = {
  PASSION: "bg-passion-400",
  POWER: "bg-power-400",
  LEGACY: "bg-legacy-400",
};

interface ProgressBarProps {
  /** 0–100 */
  value: number;
  stage?: Stage;
  className?: string;
  trackClassName?: string;
  label?: string;
  /** Visually shows the percentage next to the bar. Screen readers always get it via aria. */
  showValue?: boolean;
  /**
   * Accessible name for the `role="progressbar"` element when there's no
   * visible `label` to source it from (e.g. the assessment's progress bar,
   * whose "Question X of Y" text lives in a separate sibling element).
   * Falls back to `label` when omitted.
   */
  ariaLabel?: string;
}

export function ProgressBar({
  value,
  stage,
  className,
  trackClassName,
  label,
  showValue = false,
  ariaLabel,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const barColor = stage ? STAGE_BAR_COLOR[stage] : "bg-navy-700";

  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-navy-500">
          {label && <span>{label}</span>}
          {showValue && <span>{clamped}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel ?? label}
        className={cn(
          "h-2.5 w-full overflow-hidden rounded-full bg-navy-100",
          trackClassName,
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-out",
            barColor,
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
