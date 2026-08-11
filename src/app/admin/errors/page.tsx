import type { Metadata } from "next";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Errors — Blueprint Admin" };
export const dynamic = "force-dynamic";

/**
 * ERROR MONITORING (launch-hardening audit finding: "how does a support
 * person diagnose without database surgery?"). The self-hosted
 * counterpart to a Sentry dashboard — every row here came from
 * `logError()` (server-side failures) or the client error boundary
 * (`/api/observability/log`), never fabricated.
 */
export default async function AdminErrorsPage() {
  const errors = await prisma.errorLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy-900">Errors</h1>
        <p className="text-sm text-foreground-muted">
          Most recent {errors.length} logged error{errors.length === 1 ? "" : "s"} (server + client).
        </p>
      </div>

      {errors.length === 0 ? (
        <EmptyState title="No errors logged" description="Nothing has been reported since this table started tracking." />
      ) : (
        <div className="flex flex-col gap-2">
          {errors.map((e) => (
            <Card key={e.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-semibold text-navy-900">{e.message}</p>
                <p className="whitespace-nowrap text-xs text-foreground-muted">
                  {e.createdAt.toLocaleString()}
                </p>
              </div>
              {e.context !== null && (
                <pre className="mt-2 overflow-x-auto rounded-lg bg-navy-50 p-2 text-xs text-navy-700">
                  {JSON.stringify(e.context, null, 2)}
                </pre>
              )}
              {e.stack && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-medium text-navy-500">Stack trace</summary>
                  <pre className="mt-1 overflow-x-auto rounded-lg bg-navy-50 p-2 text-xs text-navy-600">{e.stack}</pre>
                </details>
              )}
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>About this page</CardTitle>
        </CardHeader>
        <p className="text-sm text-foreground-muted">
          Self-hosted error log — no third-party account required. Server-side failures (Stripe webhook
          handling, Blueprint AI calls) and client-side crashes both report here automatically. This table
          isn&apos;t purged on a schedule yet; see BUILD_STATUS.md.
        </p>
      </Card>
    </div>
  );
}
