import Link from "next/link";
import type { ReactNode } from "react";

import { STAFF_ROLES } from "@/lib/rbac";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function FacilitatorLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole(STAFF_ROLES, "/facilitator");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-navy-100 bg-surface px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <Link
              href="/facilitator"
              className="font-display text-lg font-semibold text-navy-900"
            >
              Blueprint Facilitator
            </Link>
            <p className="text-xs text-foreground-muted">
              Signed in as {user.firstName} {user.lastName} · {user.role}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-navy-500 hover:text-navy-800"
          >
            Back to member app
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
