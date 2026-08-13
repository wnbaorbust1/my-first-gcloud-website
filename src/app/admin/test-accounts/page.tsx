import { FlaskConical } from "lucide-react";
import type { Metadata } from "next";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MEMBERSHIP_STATUS_LABELS } from "@/lib/billing/membership";
import { prisma } from "@/lib/prisma";

import { CreateTestAccountForm } from "./create-test-account-form";
import { TestAccountControls } from "./test-account-controls";

export const metadata: Metadata = { title: "Test Accounts — Blueprint Admin" };
export const dynamic = "force-dynamic";

/**
 * ADMIN TEST ACCOUNTS (Phase 7 continued) — real, dedicated sandbox
 * logins an admin can open in a second browser to see exactly what a
 * member sees at a given membership stage (free 30-day trial vs. a
 * 1-year subscriber), never a real customer's data and never a
 * simulated session swap. Excluded from every real metric/funnel via
 * `Business.isTestAccount`.
 */
export default async function AdminTestAccountsPage() {
  const accounts = await prisma.business.findMany({
    where: { isTestAccount: true },
    orderBy: { createdAt: "desc" },
    include: { memberships: { include: { user: { select: { email: true } } }, take: 1 } },
  });
  const businessIds = accounts.map((a) => a.id);
  const memberships = await prisma.membership.findMany({ where: { businessId: { in: businessIds } } });
  const membershipByBusiness = new Map(memberships.map((m) => [m.businessId, m]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy-900">Test Accounts</h1>
        <p className="text-sm text-foreground-muted">
          Real sandbox logins for previewing what a member sees at a given membership stage — never
          counted in any real metric or funnel.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create a Test Account</CardTitle>
        </CardHeader>
        <CreateTestAccountForm />
      </Card>

      {accounts.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="No test accounts yet"
          description="Create one above, then set its preview state below."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {accounts.map((a) => {
            const membership = membershipByBusiness.get(a.id) ?? null;
            return (
              <Card key={a.id}>
                <CardHeader>
                  <CardTitle>{a.name}</CardTitle>
                </CardHeader>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="text-foreground-muted">
                    Login: <span className="font-mono text-navy-800">{a.memberships[0]?.user.email ?? "—"}</span>
                  </span>
                  <span className="rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-medium text-navy-700">
                    {a.builderAccessEligible ? "Builder unlocked" : "Builder locked"}
                  </span>
                  <span className="rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-medium text-navy-700">
                    {membership ? (MEMBERSHIP_STATUS_LABELS[membership.status] ?? membership.status) : "No membership yet"}
                  </span>
                </div>
                <div className="mt-3">
                  <TestAccountControls businessId={a.id} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
