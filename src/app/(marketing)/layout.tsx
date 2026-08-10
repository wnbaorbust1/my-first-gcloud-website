import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-navy-100/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="font-display text-xl font-semibold tracking-tight text-navy-900"
          >
            Blueprint
          </Link>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Log In</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Start My Blueprint</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-navy-100/60 px-6 py-8 text-center text-xs text-foreground-muted">
        Blueprint · From Passion to Power to Legacy™
      </footer>
    </div>
  );
}
