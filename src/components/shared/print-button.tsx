"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Spec minimum for Phase 6 DOWNLOAD: the browser's own Print → Save as PDF, no new dependency required. */
export function PrintButton() {
  return (
    <Button type="button" size="sm" onClick={() => window.print()}>
      <Printer className="h-4 w-4" aria-hidden="true" />
      Print / Save as PDF
    </Button>
  );
}
