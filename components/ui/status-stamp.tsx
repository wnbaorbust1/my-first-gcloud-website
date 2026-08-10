import { cn } from "@/lib/utils";

/**
 * Small gold-leaf stamp used in the margin next to a ledger row to mark a
 * status change (mastered, graded, submitted) — used instead of a generic
 * colored pill badge everywhere the app shows list/table status.
 */
export function StatusStamp({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn("status-stamp animate-stamp-land", className)}
    >
      <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true">
        <path
          d="M2 8.5 6 12l8-8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
