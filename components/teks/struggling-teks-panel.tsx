import { LedgerRow } from "@/components/ui/ledger-row";
import type { Teks } from "@/types/curriculum";

export function StrugglingTeksPanel({
  strugglingCodes,
}: {
  strugglingCodes: { teks: Teks; belowMasteryCount: number }[];
}) {
  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Struggling TEKS<span className="text-rose-gold">.</span>
        </h2>
        <span className="font-mono text-xs text-slate">
          {strugglingCodes.length} flagged
        </span>
      </div>
      <p className="mt-1 max-w-xl text-sm text-slate">
        Codes where multiple students are below mastery — worth a reteach or a different approach.
      </p>

      <div className="mt-3 border-t border-rose-gold/40">
        {strugglingCodes.length === 0 ? (
          <p className="py-4 text-sm text-slate">
            Nothing flagged — no TEKS code has multiple students below mastery right now.
          </p>
        ) : (
          strugglingCodes.map(({ teks, belowMasteryCount }) => (
            <LedgerRow
              key={teks.id}
              meta={
                <span className="text-rose-gold">
                  {belowMasteryCount} below mastery
                </span>
              }
            >
              <p className="font-mono text-xs text-ink">{teks.code}</p>
              <p className="mt-0.5 text-sm text-slate">{teks.description}</p>
            </LedgerRow>
          ))
        )}
      </div>
    </section>
  );
}
