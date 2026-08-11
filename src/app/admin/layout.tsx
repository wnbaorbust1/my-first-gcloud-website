import Link from "next/link";
import type { ReactNode } from "react";

import { ADMIN_ROLES } from "@/lib/rbac";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

const ADMIN_NAV = [
  { label: "Overview", href: "/admin" },
  { label: "Users", href: "/admin/users" },
  { label: "Organizations", href: "/admin/organizations" },
  { label: "Sessions", href: "/admin/sessions" },
  { label: "Content", href: "/admin/content" },
  { label: "Assessments", href: "/admin/assessments" },
  { label: "Analytics", href: "/admin/analytics" },
  { label: "Support", href: "/admin/support" },
  { label: "Errors", href: "/admin/errors" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireRole(ADMIN_ROLES, "/admin");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-navy-100 bg-navy-900 px-6 py-4 text-cream-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <Link href="/admin" className="font-display text-lg font-semibold">
              Blueprint Admin
            </Link>
            <p className="text-xs text-navy-300">
              Signed in as {user.firstName} {user.lastName} · {user.role}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-navy-200 hover:text-cream-50"
          >
            Back to member app
          </Link>
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl gap-8 px-6 py-8">
        <nav className="w-48 shrink-0 space-y-1">
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-navy-600 hover:bg-navy-50 hover:text-navy-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
