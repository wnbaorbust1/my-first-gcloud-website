import { CreditCard, KeyRound, User as UserIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/session";

import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = { title: "Settings — Blueprint" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-3xl font-semibold text-navy-900">
        Settings
      </h1>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-navy-400" aria-hidden="true" />
            <CardTitle>Account</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-foreground-muted">Name</p>
            <p className="font-medium text-navy-900">
              {user.firstName} {user.lastName}
            </p>
          </div>
          <div>
            <p className="text-foreground-muted">Email</p>
            <p className="font-medium text-navy-900">{user.email}</p>
          </div>
          <div>
            <p className="text-foreground-muted">Role</p>
            <p className="font-medium text-navy-900">{user.role}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-navy-400" aria-hidden="true" />
            <CardTitle>Password</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-navy-400" aria-hidden="true" />
            <CardTitle>Billing</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-foreground-muted">
          <p>
            Your first 30 days of Blueprint Builder are free after attending a
            qualifying session, then $9.99/month or $100/year.
          </p>
          <Button asChild size="sm" className="mt-3">
            <Link href="/billing">Manage Billing</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
