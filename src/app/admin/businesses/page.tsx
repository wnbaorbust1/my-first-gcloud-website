import type { Metadata } from "next";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/form-input";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Businesses — Blueprint Admin" };
export const dynamic = "force-dynamic";

/**
 * ADMIN FULL PLATFORM ACCESS — an admin's backend authorization already
 * covers any business (assertBusinessAccess grants ADMIN_ROLES full
 * access via can.viewAllBusinesses), but until now there was no way to
 * actually find and open a specific member's business from the admin
 * side. This is that entry point: search by business name or owner
 * name/email, then jump to view/manage that business's My Blueprint,
 * Vision Board Profile, Scorecard, roadmap, and assessment.
 */
export default async function AdminBusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim();

  const businesses = await prisma.business.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            {
              memberships: {
                some: {
                  user: {
                    OR: [
                      { email: { contains: query, mode: "insensitive" } },
                      { firstName: { contains: query, mode: "insensitive" } },
                      { lastName: { contains: query, mode: "insensitive" } },
                    ],
                  },
                },
              },
            },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      memberships: {
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy-900">Businesses</h1>
        <p className="text-sm text-foreground-muted">
          Find any member&apos;s business to view or manage their Blueprint, Vision Board, and
          Scorecard — as an admin, you have full access regardless of billing or Builder-unlock
          state.
        </p>
      </div>

      <form className="max-w-sm">
        <Input
          type="search"
          name="q"
          placeholder="Search by business name or owner…"
          defaultValue={query}
        />
      </form>

      {businesses.length === 0 ? (
        <p className="text-sm text-foreground-muted">
          {query ? "No businesses match that search." : "No businesses yet."}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {businesses.map((b) => {
            const owner = b.memberships[0]?.user;
            return (
              <Link key={b.id} href={`/admin/businesses/${b.id}`}>
                <Card className="p-4 hover:border-navy-200">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-navy-900">{b.name}</p>
                      <p className="text-xs text-foreground-muted">
                        {owner ? `${owner.firstName} ${owner.lastName} · ${owner.email}` : "No owner"}
                        {b.industry && ` · ${b.industry}`}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-navy-400">
                      {b.builderAccessEligible ? "Builder unlocked" : "Builder locked"}
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
