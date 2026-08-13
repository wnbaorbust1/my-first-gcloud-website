import Link from "next/link";
import type { ReactNode } from "react";

import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Shell for the Organization area (spec Prompt 12). Deliberately not
 * role-gated in proxy.ts the way /admin and /facilitator are — an
 * organization's own staff hold no platform-wide Role at all, just an
 * OrganizationMembership row for their specific org. Every page under
 * here enforces real access itself via assertOrganizationAccess; this
 * layout only requires a signed-in user.
 */
export default async function OrganizationLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-navy-100 bg-navy-900 px-6 py-4 text-cream-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <Link href="/organization" className="font-display text-lg font-semibold">
              Blueprint Organizations
            </Link>
            <p className="text-xs text-navy-300">
              Signed in as {user.firstName} {user.lastName}
            </p>
          </div>
          <Link href="/dashboard" className="text-sm font-medium text-navy-200 hover:text-cream-50">
            Back to member app
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
