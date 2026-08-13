import type { ReactNode } from "react";

import { BottomNav } from "@/components/nav/bottom-nav";
import { Sidebar } from "@/components/nav/sidebar";

interface AppShellProps {
  firstName: string;
  businessName?: string | null;
  children: ReactNode;
}

/**
 * The authenticated member shell: desktop sidebar + mobile bottom nav
 * (spec Task 8), wrapping every page under the (app) route group.
 */
export function AppShell({ firstName, businessName, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar firstName={firstName} businessName={businessName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 px-4 pb-24 pt-6 sm:px-6 md:pb-10 lg:px-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
