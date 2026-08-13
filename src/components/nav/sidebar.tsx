"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { SIDEBAR_ITEMS } from "./nav-items";

interface SidebarProps {
  firstName: string;
  businessName?: string | null;
}

export function Sidebar({ firstName, businessName }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-navy-100 bg-surface md:flex">
      <div className="flex h-16 items-center px-6">
        <Link
          href="/dashboard"
          className="font-display text-xl font-semibold tracking-tight text-navy-900"
        >
          Blueprint
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {SIDEBAR_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-navy-800 text-cream-50"
                  : "text-navy-600 hover:bg-navy-50 hover:text-navy-900",
              )}
            >
              <Icon className="h-4.5 w-4.5" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-navy-100 p-4">
        <div className="mb-3 min-w-0">
          <p className="truncate text-sm font-semibold text-navy-900">
            {firstName}
          </p>
          <p className="truncate text-xs text-foreground-muted">
            {businessName ?? "No business yet"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-navy-500 transition-colors hover:bg-navy-50 hover:text-navy-800"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Log out
        </button>
      </div>
    </aside>
  );
}
