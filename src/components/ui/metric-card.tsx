import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: ReactNode;
  helpText?: string;
  icon?: LucideIcon;
  accent?: "navy" | "gold" | "passion" | "power" | "legacy";
  className?: string;
}

const ACCENT_CLASSES = {
  navy: "bg-navy-50 text-navy-700",
  gold: "bg-gold-50 text-gold-600",
  passion: "bg-passion-50 text-passion-600",
  power: "bg-power-50 text-power-600",
  legacy: "bg-legacy-50 text-legacy-600",
} as const;

/** A single bold number with a label — used for at-a-glance dashboard stats. */
export function MetricCard({
  label,
  value,
  helpText,
  icon: Icon,
  accent = "navy",
  className,
}: MetricCardProps) {
  return (
    <Card className={cn("flex items-start gap-4", className)}>
      {Icon && (
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            ACCENT_CLASSES[accent],
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      )}
      <div>
        <p className="text-sm font-medium text-foreground-muted">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-navy-900">
          {value}
        </p>
        {helpText && (
          <p className="mt-1 text-xs text-foreground-muted">{helpText}</p>
        )}
      </div>
    </Card>
  );
}
