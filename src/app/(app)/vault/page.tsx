import { Archive, FileText, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MembershipLockedNotice } from "@/components/billing/membership-locked-notice";
import { getGatedBusinessContext } from "@/lib/billing/access-guard";
import { getVaultContents, VAULT_FOLDERS, type VaultOrigin } from "@/lib/vault/vault";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Blueprint Vault — Blueprint" };
export const dynamic = "force-dynamic";

const ORIGIN_BADGE: Record<VaultOrigin, string> = {
  You: "bg-navy-50 text-navy-600",
  "Your Facilitator": "bg-gold-50 text-gold-700",
  "AI-assisted": "bg-power-50 text-power-700",
};

/**
 * BLUEPRINT VAULT (BLUEPRINT_MASTER_SPEC_CLAUDE_CODE.md §10, Phase E).
 * Every real asset the member has already created, organized into the
 * spec's folder structure — see src/lib/vault/vault.ts for exactly what
 * counts as an asset and why. Folders with nothing in them yet are shown
 * empty, not hidden — an honest reflection of where the business
 * actually stands, matching this app's "no fabricated content" rule.
 */
export default async function VaultPage() {
  const user = await requireUser();
  const { ub, access } = await getGatedBusinessContext(user.id);

  if (!ub) {
    return (
      <EmptyState
        icon={Archive}
        title="Set up your business first"
        description="Your Vault fills in automatically as you build."
      />
    );
  }
  if (access.locked && access.reason === "not-unlocked") {
    return (
      <EmptyState
        icon={Archive}
        title="Your Vault unlocks after your Blueprint Session"
        description="Every asset you build gets saved here automatically once your Builder access is unlocked."
      />
    );
  }
  if (access.locked) {
    return <MembershipLockedNotice />;
  }

  const contents = await getVaultContents(ub.businessId);
  const totalItems = VAULT_FOLDERS.reduce((sum, f) => sum + contents[f].length, 0);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-3xl font-semibold text-navy-900">Blueprint Vault</h1>
          <p className="mt-1 text-foreground-muted">
            Every asset you&apos;ve built, saved automatically and organized for you.
          </p>
        </div>
        <Button asChild size="sm" variant="outline" className="shrink-0">
          <Link href="/my-blueprint/documents">
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            Download &amp; Print
          </Link>
        </Button>
      </div>

      {totalItems === 0 ? (
        <EmptyState
          className="mt-8"
          icon={Sparkles}
          title="Nothing saved yet"
          description="Complete your first Business Builder task and it'll show up here automatically."
          action={
            <Button asChild size="sm">
              <Link href="/build">Go to Business Builder</Link>
            </Button>
          }
        />
      ) : (
        <div className="mt-8 flex flex-col gap-3">
          {VAULT_FOLDERS.map((folder) => {
            const folderItems = contents[folder];
            return (
              <details
                key={folder}
                open={folderItems.length > 0}
                className="group rounded-2xl border border-navy-100 bg-surface open:pb-2"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 marker:content-none">
                  <span className="font-display text-base font-semibold text-navy-900">{folder}</span>
                  <span className="flex items-center gap-3 text-xs font-medium text-foreground-muted">
                    {folderItems.length} item{folderItems.length === 1 ? "" : "s"}
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      className="h-4 w-4 shrink-0 text-navy-300 transition-transform group-open:rotate-180"
                    >
                      <path
                        d="M5 7.5 10 12.5 15 7.5"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </svg>
                  </span>
                </summary>
                <div className="border-t border-navy-100 px-5 pt-3">
                  {folderItems.length === 0 ? (
                    <p className="py-3 text-sm text-foreground-muted">Nothing here yet.</p>
                  ) : (
                    <ul className="flex flex-col divide-y divide-navy-50">
                      {folderItems.map((item) => (
                        <li key={item.id} className="py-3">
                          <Link href={item.viewHref} className="flex items-center justify-between gap-3 hover:opacity-80">
                            <span className="text-sm font-medium text-navy-900">{item.title}</span>
                            <span
                              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${ORIGIN_BADGE[item.origin]}`}
                            >
                              {item.origin}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}

      <Card className="mt-8 border-navy-100 bg-navy-50">
        <p className="text-xs text-foreground-muted">
          Every item here links to where it lives — open it to view or edit. Downloading, printing, and
          emailing your full Blueprint document is available above.
        </p>
      </Card>
    </div>
  );
}
