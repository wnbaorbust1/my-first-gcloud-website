import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The signature "Ledger Line" list/table row: a thin rose-gold rule
 * underneath, an optional gold-leaf status stamp in the left margin, and
 * an optional right-aligned mono data slot (grades, TEKS codes, dates).
 *
 * Use this for every list/table row in the app — lessons, TEKS rows,
 * gradebook rows, portfolio items — so the motif stays consistent.
 */
export function LedgerRow({
  children,
  meta,
  stamp,
  className,
}: {
  children: ReactNode;
  meta?: ReactNode;
  stamp?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("ledger-row flex items-start gap-3", className)}>
      <div className="w-5 shrink-0 pt-0.5">{stamp}</div>
      <div className="min-w-0 flex-1 text-sm text-ink">{children}</div>
      {meta && (
        <div className="shrink-0 pt-0.5 font-mono text-xs text-slate">{meta}</div>
      )}
    </div>
  );
}
