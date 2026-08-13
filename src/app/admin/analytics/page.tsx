import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { getSignupFunnel } from "@/lib/admin/funnel";

export const metadata: Metadata = { title: "Analytics — Blueprint Admin" };
export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const stages = await getSignupFunnel();
  const trackedCounts = stages.map((s) => s.count).filter((c): c is number => c !== null);
  const maxCount = trackedCounts.length > 0 ? Math.max(...trackedCounts) : 1;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy-900">Funnel</h1>
        <p className="text-sm text-foreground-muted">
          Signup through paid conversion, in order — every number is a real count.
        </p>
      </div>

      <Card>
        <div className="flex flex-col gap-3">
          {stages.map((stage) => {
            const widthPercent = stage.count !== null ? Math.max(4, (stage.count / maxCount) * 100) : 0;
            return (
              <div key={stage.label}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className="font-medium text-navy-800">{stage.label}</span>
                  <span className="font-semibold text-navy-900">
                    {stage.count !== null ? stage.count : stage.note ?? "—"}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-navy-50">
                  {stage.count !== null ? (
                    <div
                      className="h-full rounded-full bg-gold-400"
                      style={{ width: `${widthPercent}%` }}
                    />
                  ) : (
                    <div className="h-full w-full rounded-full bg-navy-100" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
