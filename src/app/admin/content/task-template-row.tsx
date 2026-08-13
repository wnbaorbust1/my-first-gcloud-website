"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Textarea } from "@/components/ui/textarea";

export function TaskTemplateRow({
  id,
  title,
  category,
  whyItMatters,
  isActive,
}: {
  id: string;
  title: string;
  category: string;
  whyItMatters: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(whyItMatters);
  const [isSaving, setIsSaving] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setIsSaving(true);
    await fetch(`/api/admin/task-templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setIsSaving(false);
    router.refresh();
  }

  function handleBlur() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === whyItMatters) {
      setValue(whyItMatters);
      return;
    }
    patch({ whyItMatters: trimmed });
  }

  return (
    <div className="rounded-xl border border-navy-100 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-navy-400">
            {category}
          </span>
          <p className="text-sm font-semibold text-navy-900">{title}</p>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-foreground-muted">
          <input
            type="checkbox"
            checked={isActive}
            disabled={isSaving}
            onChange={(e) => patch({ isActive: e.target.checked })}
          />
          Active
        </label>
      </div>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        disabled={isSaving}
        rows={2}
        className="text-xs"
      />
    </div>
  );
}
