"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Curriculum", href: "/admin/curriculum" },
  { label: "Assignments", href: "/admin/assignments" },
  { label: "Assessments", href: "/admin/assessments" },
  { label: "Simulations", href: "/admin/simulations" },
  { label: "TEKS Import", href: "/admin/teks" },
];

/** Top-of-page tab nav for the /admin area — switches between the two
 * content-authoring domains without cluttering the main NavRail. */
export function AdminTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="mb-6 flex items-center gap-1 border-b border-rose-gold/40 pb-3">
      <span className="mr-3 font-mono text-[11px] uppercase tracking-[0.18em] text-rose-gold">
        Admin
      </span>
      {TABS.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "px-3 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors",
              isActive ? "bg-ink text-cream" : "text-slate hover:text-ink",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
