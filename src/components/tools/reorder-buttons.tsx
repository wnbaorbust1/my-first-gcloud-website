"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Shared up/down reorder control for the two Phase 10 tools with a real
 * sequence — Customer Journey stages and Automation Mapper steps ("Allow
 * visual sequence" / "Allow user to customize... reorder"). Swaps this
 * item's `order` with the given neighbor's via two PATCH calls; the
 * server has no unique constraint on `order`, so a brief duplicate
 * mid-swap is harmless and self-corrects on refresh.
 */
export function ReorderButtons({
  endpoint,
  order,
  prevEndpoint,
  prevOrder,
  nextEndpoint,
  nextOrder,
}: {
  endpoint: string;
  order: number;
  prevEndpoint: string | null;
  prevOrder: number | null;
  nextEndpoint: string | null;
  nextOrder: number | null;
}) {
  const router = useRouter();
  const [isMoving, setIsMoving] = useState(false);

  async function swap(neighborEndpoint: string, neighborOrder: number) {
    setIsMoving(true);
    await Promise.all([
      fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: neighborOrder }),
      }),
      fetch(neighborEndpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order }),
      }),
    ]);
    setIsMoving(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => prevEndpoint && prevOrder !== null && swap(prevEndpoint, prevOrder)}
        disabled={isMoving || !prevEndpoint}
        aria-label="Move up"
        className="rounded p-0.5 text-navy-400 transition-colors hover:text-navy-700 disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronUp className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => nextEndpoint && nextOrder !== null && swap(nextEndpoint, nextOrder)}
        disabled={isMoving || !nextEndpoint}
        aria-label="Move down"
        className="rounded p-0.5 text-navy-400 transition-colors hover:text-navy-700 disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
