"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Shared up/down reorder control for the two Phase 10 tools with a real
 * sequence — Customer Journey stages and Automation Mapper steps ("Allow
 * visual sequence" / "Allow user to customize... reorder"). Swaps this
 * item's `order` with a neighbor's via a single atomic call to the
 * tool's `/reorder` endpoint, which does both updates inside one Prisma
 * transaction — no partial-swap or duplicate-order window like the
 * original two-independent-PATCH version had.
 */
export function ReorderButtons({
  reorderEndpoint,
  id,
  prevId,
  nextId,
}: {
  /** e.g. "/api/tools/journey/reorder" or "/api/tools/automation/reorder" */
  reorderEndpoint: string;
  id: string;
  prevId: string | null;
  nextId: string | null;
}) {
  const router = useRouter();
  const [isMoving, setIsMoving] = useState(false);

  async function swap(neighborId: string) {
    setIsMoving(true);
    await fetch(reorderEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aId: id, bId: neighborId }),
    });
    setIsMoving(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => prevId && swap(prevId)}
        disabled={isMoving || !prevId}
        aria-label="Move up"
        className="rounded p-0.5 text-navy-400 transition-colors hover:text-navy-700 disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronUp className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => nextId && swap(nextId)}
        disabled={isMoving || !nextId}
        aria-label="Move down"
        className="rounded p-0.5 text-navy-400 transition-colors hover:text-navy-700 disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
