"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { DeleteButton } from "@/components/tools/delete-button";
import { EditToolModal, type EditField } from "@/components/tools/edit-tool-modal";
import { ReorderButtons } from "@/components/tools/reorder-buttons";
import { Input } from "@/components/ui/form-input";

const JOURNEY_STAGE_EDIT_FIELDS: EditField[] = [
  { key: "name", label: "Stage Name", type: "text", required: true, maxLength: 100 },
  { key: "description", label: "Description", type: "textarea", rows: 3, maxLength: 1000 },
];

interface JourneyStageRowProps {
  id: string;
  name: string;
  description: string | null;
  prevId: string | null;
  nextId: string | null;
  index: number;
}

/**
 * One customizable journey stage — spec: "Allow user to customize"
 * (rename inline, reorder with the shared up/down control, remove).
 * Description is edited via the same full-field modal every other tool
 * uses; name stays additionally editable inline for a fast rename.
 */
export function JourneyStageRow({
  id,
  name,
  description,
  prevId,
  nextId,
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
      <EditToolModal
        endpoint={`/api/tools/journey/${id}`}
        title="Edit Stage"
        fields={JOURNEY_STAGE_EDIT_FIELDS}
        initialValues={{ name, description }}
      />
      <ReorderButtons reorderEndpoint="/api/tools/journey/reorder" id={id} prevId={prevId} nextId={nextId} />
      <DeleteButton
        endpoint={`/api/tools/journey/${id}`}
        confirmText="Remove this stage from your journey?"
        label=""
      />
    </div>
  );
}
