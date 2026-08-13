import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

import { RoleControl } from "./role-control";

export const metadata: Metadata = { title: "Manage Users — Blueprint Admin" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const currentUser = await requireUser();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true, createdAt: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy-900">Users</h1>
        <p className="text-sm text-foreground-muted">
          {users.length} user{users.length === 1 ? "" : "s"} — change role below (only a Super Admin
          can grant Admin or Super Admin).
        </p>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-navy-100 text-xs font-semibold uppercase tracking-wide text-navy-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-navy-50 last:border-0">
                <td className="px-4 py-3 font-medium text-navy-900">
                  {u.firstName} {u.lastName}
                  {!u.isActive && (
                    <span className="ml-2 rounded-full bg-navy-100 px-2 py-0.5 text-xs text-navy-500">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-foreground-muted">{u.email}</td>
                <td className="px-4 py-3">
                  <RoleControl userId={u.id} role={u.role} disabled={u.id === currentUser.id} />
                </td>
                <td className="px-4 py-3 text-foreground-muted">
                  {u.createdAt.toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
