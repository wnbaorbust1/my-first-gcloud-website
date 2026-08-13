import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/prisma";

import { SupportStatusControl } from "./support-status-control";

export const metadata: Metadata = { title: "Support Inbox — Blueprint Admin" };
export const dynamic = "force-dynamic";

export default async function AdminSupportPage() {
  const requests = await prisma.supportRequest.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
    take: 200,
  });

  const openCount = requests.filter((r) => r.status === "OPEN").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy-900">Support Inbox</h1>
        <p className="text-sm text-foreground-muted">
          {openCount} open request{openCount === 1 ? "" : "s"} of {requests.length} total.
        </p>
      </div>

      {requests.length === 0 ? (
        <EmptyState title="No support requests" description="Nothing has come in yet." />
      ) : (
        <div className="flex flex-col gap-2">
          {requests.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-navy-900">{r.subject}</p>
                  <p className="text-xs text-foreground-muted">
                    {r.user.firstName} {r.user.lastName} · {r.user.email} · {r.createdAt.toLocaleString()}
                  </p>
                </div>
                <SupportStatusControl requestId={r.id} status={r.status} />
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-navy-700">{r.message}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
