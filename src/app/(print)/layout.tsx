import type { ReactNode } from "react";

import { requireUser } from "@/lib/session";

// Printable views (generated Documents, Blueprint Scorecard) live outside
// the app shell entirely — no sidebar/bottom nav to hide with print CSS,
// just a plain page. Still auth-gated, same as every (app) page.
export const dynamic = "force-dynamic";

export default async function PrintLayout({ children }: { children: ReactNode }) {
  await requireUser();

  return (
    <div className="min-h-screen bg-navy-50 px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto w-full max-w-3xl">{children}</div>
    </div>
  );
}
