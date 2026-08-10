import { Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, STAGE_META, type Stage } from "@/lib/utils";

export type TaskPriority = "MUST_DO" | "SHOULD_DO" | "BONUS";

const PRIORITY_META: Record<TaskPriority, { label: string; className: string }> = {
  MUST_DO: { label: "Must Do", className: "bg-passion-50 text-passion-700" },
  SHOULD_DO: { label: "Should Do", className: "bg-power-50 text-power-700" },
  BONUS: { label: "Bonus", className: "bg-legacy-50 text-legacy-700" },
};

interface TaskCardProps {
  title: string;
  stage: Stage;
  priority: TaskPriority;
  estimatedMins?: number;
  icon?: LucideIcon;
  ctaLabel?: string;
  onAction?: () => void;
  /** Renders the CTA as a link instead of a button — use for server components, which can't pass onAction. */
  href?: string;
  className?: string;
}

export function TaskCard({
  title,
  stage,
  priority,
  estimatedMins,
  icon: Icon = Clock,
  ctaLabel = "Start",
  onAction,
  href,
  className,
}: TaskCardProps) {
  const priorityMeta = PRIORITY_META[priority];
  const stageMeta = STAGE_META[stage];

  return (
    <Card className={cn("flex items-center gap-4", className)}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-600">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
              priorityMeta.className,
            )}
          >
            {priorityMeta.label}
          </span>
          <span className="text-xs text-foreground-muted">
            {stageMeta.icon} {stageMeta.label}
          </span>
        </div>
        <p className="truncate text-sm font-semibold text-navy-900">{title}</p>
        {estimatedMins && (
          <p className="mt-0.5 text-xs text-foreground-muted">
            ~{estimatedMins} min
          </p>
        )}
      </div>
      {href ? (
        <Button size="sm" variant="outline" asChild className="shrink-0">
          <Link href={href}>{ctaLabel}</Link>
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={onAction} className="shrink-0">
          {ctaLabel}
        </Button>
      )}
    </Card>
  );
}
