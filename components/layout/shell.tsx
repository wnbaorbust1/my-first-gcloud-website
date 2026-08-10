"use client";

import { useState } from "react";
import { NavRail } from "@/components/layout/nav-rail";

/**
 * App shell: the planner-spine NavRail pinned on the left for desktop,
 * collapsing to a top bar + slide-over drawer on small screens. Keeps
 * the "bound planner" instinct rather than falling back to a generic
 * hamburger sidebar pattern on desktop.
 */
export function Shell({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-cream md:flex-row">
      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-rose-gold/40 bg-cream px-4 py-3 md:hidden">
        <span className="font-display text-xl font-semibold text-ink">
          Legacy Command Center
        </span>
        <button
          type="button"
          onClick={() => setNavOpen((open) => !open)}
          aria-expanded={navOpen}
          aria-controls="mobile-nav-rail"
          className="rounded border border-rose-gold/50 px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink"
        >
          {navOpen ? "Close" : "Menu"}
        </button>
      </header>

      {/* Mobile slide-over nav */}
      {navOpen && (
        <div id="mobile-nav-rail" className="animate-page-turn md:hidden">
          <NavRail />
        </div>
      )}

      {/* Desktop rail */}
      <div className="hidden md:block md:w-64 md:shrink-0">
        <div className="sticky top-0 h-screen">
          <NavRail />
        </div>
      </div>

      <main className="flex-1 px-4 py-8 sm:px-8 lg:px-12">{children}</main>
    </div>
  );
}
