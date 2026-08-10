"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Input } from "@/components/ui/form-input";

export function QuestionRow({
  id,
  prompt,
  category,
  weight,
  isActive,
}: {
  id: string;
  prompt: string;
  category: string;
  weight: number;
  isActive: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(prompt);
  const [isSaving, setIsSaving] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setIsSaving(true);
    await fetch(`/api/admin/assessment-questions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setIsSaving(false);
    router.refresh();
  }

  function handleBlur() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === prompt) {
      setValue(prompt);
      return;
    }
    patch({ prompt: trimmed });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-navy-100 p-3">
      <span className="w-28 shrink-0 text-xs font-semibold uppercase tracking-wide text-navy-400">
        {category}
      </span>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        disabled={isSaving}
        className="h-9 min-w-[240px] flex-1"
      />
      <label className="flex items-center gap-1.5 text-xs text-foreground-muted">
        <input
          type="checkbox"
          checked={isActive}
          disabled={isSaving}
          onChange={(e) => patch({ isActive: e.target.checked })}
        />
        Active
      </label>
      <label className="flex items-center gap-1.5 text-xs text-foreground-muted">
        Weight
        <input
          type="number"
          step="0.1"
          min="0"
          defaultValue={weight}
          disabled={isSaving}
          onBlur={(e) => {
            const num = Number(e.target.value);
            if (!Number.isNaN(num) && num > 0) patch({ weight: num });
          }}
          className="h-8 w-16 rounded-lg border border-navy-200 px-2 text-xs"
        />
      </label>
    </div>
  );
}
