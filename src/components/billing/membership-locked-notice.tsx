import { Lock } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * EXPIRED ACCOUNT (spec Prompt 8): "Lock premium Builder functionality"
 * — shown on /build, /roadmap, /my-blueprint, and /ai in place of their
 * normal content once a business's membership no longer grants access
 * (trial ran out, unconverted; or a cancelled subscription's paid period
 * ended). Never implies data was lost — "Your Blueprint is saved"
 * matches the spec's required copy.
 */
export function MembershipLockedNotice() {
  return (
    <EmptyState
      icon={Lock}
      title="Your Blueprint is saved"
      description="Your Blueprint Builder access has ended, but nothing you built is gone — your assessment, roadmap, and My Blueprint content are all still here. Reactivate to keep building."
      action={
        <Button asChild size="sm">
          <Link href="/billing">View Billing &amp; Reactivate</Link>
        </Button>
      }
    />
  );
}
