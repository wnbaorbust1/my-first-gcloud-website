"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * ERROR MONITORING (launch-hardening audit finding). Next.js App Router's
 * segment-level error boundary — catches anything that escapes a page
 * below the root layout and shows a real, on-brand recovery screen
 * instead of the framework's default. Reports to the self-hosted
 * ErrorLog via /api/observability/log (a Client Component can't reach
 * Prisma directly) — "fire and forget," a failed report must never make
 * the error screen itself throw.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    fetch("/api/observability/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        digest: error.digest,
        url: typeof window !== "undefined" ? window.location.href : undefined,
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-display text-2xl font-semibold text-navy-900">Something went wrong</p>
      <p className="max-w-md text-sm text-foreground-muted">
        This has been logged and we&apos;ll look into it. Your other data is safe — try again, or head back to your
        dashboard.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => reset()}>Try again</Button>
        <Button asChild variant="ghost">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
