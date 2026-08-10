import { Check, Lock } from "lucide-react";

import { cn, STAGE_META, type Stage } from "@/lib/utils";

export type RoadmapItemStatus = "COMPLETED" | "CURRENT" | "NOT_STARTED" | "LOCKED";

interface RoadmapItemProps {
  title: string;
  stage: Stage;
  status: RoadmapItemStatus;
  /** Hide the connecting line below the last item. */
  isLast?: boolean;
  className?: string;
}

const NODE_CLASSES: Record<RoadmapItemStatus, string> = {
  COMPLETED: "bg-navy-800 text-cream-50 border-navy-800",
  CURRENT: "bg-gold-400 text-navy-900 border-gold-400",
  NOT_STARTED: "bg-surface text-navy-300 border-navy-200",
  LOCKED: "bg-navy-50 text-navy-300 border-navy-100",
};

export function RoadmapItem({
  title,
  stage,
  status,
  isLast = false,
  className,
}: RoadmapItemProps) {
  const stageMeta = STAGE_META[stage];

  return (
    <div className={cn("relative flex gap-4 pb-8 last:pb-0", className)}>
      {!isLast && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute left-[19px] top-10 h-[calc(100%-2.5rem)] w-0.5",
            status === "COMPLETED" ? "bg-navy-800" : "bg-navy-100",
          )}
        />
      )}
      <span
        className={cn(
          "z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold",
          NODE_CLASSES[status],
        )}
      >
        {status === "COMPLETED" ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : status === "LOCKED" ? (
          <Lock className="h-4 w-4" aria-hidden="true" />
        ) : (
          <span aria-hidden="true">{stageMeta.icon}</span>
        )}
      </span>
      <div className="pt-1.5">
        <p
          className={cn(
            "text-sm font-semibold",
            status === "LOCKED" ? "text-navy-300" : "text-navy-900",
          )}
        >
          {title}
        </p>
        <p className="text-xs text-foreground-muted">
          {stageMeta.label}
          {status === "CURRENT" && " · In progress"}
          {status === "LOCKED" && " · Locked"}
        </p>
      </div>
    </div>
  );
}
