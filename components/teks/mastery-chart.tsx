"use client";

import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { MASTERY_STATUSES, MASTERY_STATUS_LABELS } from "@/lib/curriculum/constants";
import type { TeksMasteryStatus } from "@/types/supabase";
import type { Teks } from "@/types/curriculum";

type ChartDatum = {
  code: string;
  description: string;
  percentMastered: number;
  counts: Record<TeksMasteryStatus, number>;
};

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ChartDatum }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0].payload;

  return (
    <div className="max-w-[240px] border border-rose-gold/50 bg-cream px-3 py-2">
      <p className="font-mono text-xs text-ink">{datum.code}</p>
      <p className="mt-1 text-xs text-slate">{datum.description}</p>
      <div className="mt-2 space-y-0.5 border-t border-rose-gold/20 pt-1.5">
        {MASTERY_STATUSES.map(
          (status) =>
            datum.counts[status] > 0 && (
              <p key={status} className="font-mono text-[11px] text-ink">
                {MASTERY_STATUS_LABELS[status]}: {datum.counts[status]}
              </p>
            ),
        )}
      </div>
    </div>
  );
}

/**
 * Single-series horizontal bar chart: one bar per TEKS code, length = %
 * of the class at "mastered." Deliberately one hue (gold-leaf, the same
 * color the mastered stamp uses) rather than a stacked multi-status bar —
 * cramming all 6 statuses into one chart mark needs six mutually
 * distinguishable colors at once, which the brand palette can't clear
 * cleanly; the full per-status breakdown is one hover away in the
 * tooltip instead. Direct % labels mitigate gold-leaf's own contrast
 * being under 3:1 against the cream surface.
 */
export function MasteryChart({
  teksCodes,
  countsByCode,
  studentCount,
}: {
  teksCodes: Teks[];
  countsByCode: Record<string, Record<TeksMasteryStatus, number>>;
  studentCount: number;
}) {
  if (teksCodes.length === 0 || studentCount === 0) return null;

  const data: ChartDatum[] = teksCodes.map((teks) => {
    const counts = countsByCode[teks.code];
    const percentMastered = Math.round((counts.mastered / studentCount) * 100);
    return { code: teks.code, description: teks.description, percentMastered, counts };
  });

  const height = Math.max(140, data.length * 36 + 40);

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 4 }}>
          <CartesianGrid horizontal={false} stroke="rgb(107 100 89 / 0.15)" />
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#6b6459" }}
            axisLine={{ stroke: "rgb(107 100 89 / 0.3)" }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="code"
            width={150}
            tick={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#2b2420" }}
            axisLine={{ stroke: "rgb(107 100 89 / 0.3)" }}
            tickLine={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgb(183 110 121 / 0.08)" }} />
          <Bar
            dataKey="percentMastered"
            fill="#c9a24b"
            radius={[0, 3, 3, 0]}
            label={{ position: "right", formatter: (v) => `${v}%`, fill: "#2b2420", fontFamily: "var(--font-mono)", fontSize: 11 }}
            maxBarSize={22}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
