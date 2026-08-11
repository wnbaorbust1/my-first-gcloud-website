"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { TrendPoint } from "@/lib/teacher/gradebook-queries";

function TrendTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: TrendPoint }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;

  return (
    <div className="max-w-[220px] border border-rose-gold/50 bg-cream px-3 py-2">
      <p className="font-mono text-xs text-ink">{point.date}</p>
      <p className="mt-1 text-xs text-slate">
        {point.itemType === "assessment" ? "Assessment" : "Assignment"}: {point.itemTitle}
      </p>
      <p className="mt-1 font-mono text-xs text-ink">{point.scorePercent}%</p>
    </div>
  );
}

/**
 * Score-over-time — a single gold-leaf line, same single-hue posture as
 * the mastery chart (this is one series, so no categorical palette
 * question even arises). Direct-labeled via the tooltip; dots mark each
 * graded item so sparse data still reads as real points, not an
 * interpolated guess.
 */
export function TrendChart({ points }: { points: TrendPoint[] }) {
  if (points.length === 0) {
    return <p className="py-4 text-sm text-slate">No grades yet for this selection.</p>;
  }

  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
          <CartesianGrid vertical={false} stroke="rgb(107 100 89 / 0.15)" />
          <XAxis
            dataKey="date"
            tick={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#6b6459" }}
            axisLine={{ stroke: "rgb(107 100 89 / 0.3)" }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#6b6459" }}
            axisLine={{ stroke: "rgb(107 100 89 / 0.3)" }}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<TrendTooltip />} cursor={{ stroke: "rgb(183 110 121 / 0.4)" }} />
          <Line
            type="monotone"
            dataKey="scorePercent"
            stroke="#c9a24b"
            strokeWidth={2}
            dot={{ r: 4, fill: "#c9a24b", stroke: "#faf7f0", strokeWidth: 1 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
