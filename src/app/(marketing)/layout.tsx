import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-navy-100/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <Link
            href="/"
            className="font-display text-lg font-semibold tracking-tight text-navy-900 sm:text-xl"
          >
            Blueprint
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/pricing"
              className="hidden text-sm font-medium text-navy-600 hover:text-navy-900 sm:inline"
            >
              Pricing
            </Link>
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Log In</Link>
            </Button>
            <Button asChild size="sm">
              {/* Shorter label below `sm` — "Start My Blueprint" overflowed the
                  320px viewport (launch-hardening audit's mobile matrix). */}
              <Link href="/signup">
                <span className="sm:hidden">Start</span>
                <span className="hidden sm:inline">Start My Blueprint</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-navy-100/60 px-6 py-8 text-center text-xs text-foreground-muted">
        <p>Blueprint · From Passion to Power to Legacy™</p>
        <nav className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link href="/terms" className="hover:text-navy-700">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-navy-700">
            Privacy
          </Link>
          <Link href="/refund-policy" className="hover:text-navy-700">
            Refund Policy
          </Link>
          <Link href="/support" className="hover:text-navy-700">
            Support
          </Link>
        </nav>
      </footer>
    </div>
  );
}
