import type { Metadata } from "next";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

import { SupportRequestForm } from "./support-request-form";

export const metadata: Metadata = { title: "Support — Blueprint" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = { OPEN: "Open", RESOLVED: "Resolved" };

export default async function SupportPage() {
  const user = await requireUser("/support");

  const requests = await prisma.supportRequest.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy-900">Support</h1>
        <p className="text-sm text-foreground-muted">
          Stuck on something, or a billing question that doesn&apos;t look right? Send us a message —
          we&apos;ll follow up at {user.email}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Send a message</CardTitle>
        </CardHeader>
        <SupportRequestForm />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your requests</CardTitle>
        </CardHeader>
        {requests.length === 0 ? (
          <EmptyState title="No requests yet" description="Anything you send above will show up here." />
        ) : (
          <div className="flex flex-col gap-2">
            {requests.map((r) => (
              <div key={r.id} className="rounded-xl border border-navy-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-navy-900">{r.subject}</p>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      r.status === "OPEN"
                        ? "bg-gold-50 text-gold-700"
                        : "bg-navy-50 text-navy-600"
                    }`}
                  >
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-navy-700">{r.message}</p>
                <p className="mt-2 text-xs text-foreground-muted">{r.createdAt.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
