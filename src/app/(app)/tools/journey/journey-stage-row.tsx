"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { DeleteButton } from "@/components/tools/delete-button";
import { ReorderButtons } from "@/components/tools/reorder-buttons";
import { Input } from "@/components/ui/form-input";

interface JourneyStageRowProps {
  id: string;
  name: string;
  description: string | null;
  order: number;
  prevId: string | null;
  prevOrder: number | null;
  nextId: string | null;
  nextOrder: number | null;
  index: number;
}

/**
 * One customizable journey stage — spec: "Allow user to customize"
 * (rename inline, reorder with the shared up/down control, remove).
 */
export function JourneyStageRow({
  id,
  name,
  description,
  order,
  prevId,
  prevOrder,
  nextId,
  nextOrder,
  index,
}: JourneyStageRowProps) {
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [isSaving, setIsSaving] = useState(false);

  async function handleBlur() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === name) {
      setValue(name);
      return;
    }
    setIsSaving(true);
    await fetch(`/api/tools/journey/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    setIsSaving(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-navy-100 bg-surface p-4 shadow-sm shadow-navy-900/5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-power-50 text-xs font-semibold text-power-700">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          disabled={isSaving}
          className="h-9 font-medium"
          aria-label="Stage name"
        />
        {description && <p className="mt-1 text-xs text-foreground-muted">{description}</p>}
      </div>
      <ReorderButtons
        endpoint={`/api/tools/journey/${id}`}
        order={order}
        prevEndpoint={prevId ? `/api/tools/journey/${prevId}` : null}
        prevOrder={prevOrder}
        nextEndpoint={nextId ? `/api/tools/journey/${nextId}` : null}
        nextOrder={nextOrder}
      />
      <DeleteButton
        endpoint={`/api/tools/journey/${id}`}
        confirmText="Remove this stage from your journey?"
        label=""
      />
    </div>
  );
}
