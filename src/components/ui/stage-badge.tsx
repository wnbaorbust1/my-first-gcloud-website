import { cn, STAGE_META, type Stage } from "@/lib/utils";

const STAGE_BADGE_CLASSES: Record<Stage, string> = {
  PASSION: "bg-passion-50 text-passion-700 border-passion-200",
  POWER: "bg-power-50 text-power-700 border-power-200",
  LEGACY: "bg-legacy-50 text-legacy-700 border-legacy-200",
};

interface StageBadgeProps {
  stage: Stage;
  className?: string;
  /** Defaults to the stage label; pass children to override (e.g. add a status). */
  children?: React.ReactNode;
}

/**
 * Never relies on color alone (spec section 30): always pairs the stage
 * color with its icon and text label.
 */
export function StageBadge({ stage, className, children }: StageBadgeProps) {
  const meta = STAGE_META[stage];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
        STAGE_BADGE_CLASSES[stage],
        className,
      )}
    >
      <span aria-hidden="true">{meta.icon}</span>
      {children ?? meta.label}
    </span>
  );
}
