import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Blueprint never shows a bare "NO X FOUND" screen (spec section 25) — an
 * empty state is framed as the start of the next step, with a CTA forward.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-dashed border-navy-200 bg-surface-muted px-6 py-12 text-center",
        className,
      )}
    >
      {Icon && (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold-50 text-gold-600">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
      )}
      <p className="text-base font-semibold text-navy-900">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-foreground-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
