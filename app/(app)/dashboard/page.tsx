import type { Metadata } from "next";
import { getCurrentProfile, requireUser } from "@/lib/auth/session";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { LedgerRow } from "@/components/ui/ledger-row";
import { StatusStamp } from "@/components/ui/status-stamp";

export const metadata: Metadata = { title: "Dashboard — Legacy Command Center" };

export default async function DashboardPage() {
  // Defense in depth — middleware is the primary guard (see
  // lib/supabase/middleware.ts), this just makes the page safe on its own.
  await requireUser();
  const profile = await getCurrentProfile();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate">Dashboard</p>
          <h1 className="mt-2 font-display text-4xl font-semibold text-ink">
            Welcome back{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}
            <span className="text-rose-gold">.</span>
          </h1>
        </div>
        <SignOutButton />
      </div>

      <section className="mt-10 border border-rose-gold/40 p-5">
        <p className="font-mono text-[11px] uppercase tracking-wide text-slate">Account</p>
        <div className="mt-3">
          <LedgerRow meta={profile?.role}>Role</LedgerRow>
          <LedgerRow
            meta={profile?.subscription_status}
            stamp={profile?.subscription_status === "active" ? <StatusStamp label="Active" /> : null}
          >
            Subscription status
          </LedgerRow>
          <LedgerRow meta={profile?.school ?? "—"}>School</LedgerRow>
        </div>
      </section>

      <p className="mt-6 text-sm text-slate">
        Auth and the core schema are wired up. Curriculum, gradebook, and the rest of the app
        land in the next phases.
      </p>
    </div>
  );
}
