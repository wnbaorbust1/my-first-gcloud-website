"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Spec minimum for Phase 6 DOWNLOAD: the browser's own Print → Save as
 * PDF, no new dependency required. `logDownload`, when passed, fires a
 * fire-and-forget request to log the download (see
 * src/app/api/blueprint/board-downloads/route.ts) — never awaited and
 * never allowed to block or fail the actual print, since a logging
 * hiccup must never stop a member from getting their PDF.
 */
export function PrintButton({
  logDownload,
}: {
  logDownload?: { businessId: string; document: "vision_board" | "scorecard" };
}) {
  function handleClick() {
    if (logDownload) {
      fetch("/api/blueprint/board-downloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logDownload),
      }).catch(() => {
        // Logging is best-effort — never block or interrupt the print.
      });
    }
    window.print();
  }

  return (
    <Button type="button" size="sm" onClick={handleClick}>
      <Printer className="h-4 w-4" aria-hidden="true" />
      Print / Save as PDF
    </Button>
  );
}
