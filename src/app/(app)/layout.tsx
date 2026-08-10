import type { ReactNode } from "react";

import { AppShell } from "@/components/nav/app-shell";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

// Every page here reads the session and (usually) the DB per request —
// none of it should be statically prerendered at build time.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  const membership = await prisma.userBusinessMembership.findFirst({
    where: { userId: user.id },
    include: { business: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <AppShell firstName={user.firstName} businessName={membership?.business.name}>
      {children}
    </AppShell>
  );
}
