"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { DeleteButton } from "@/components/tools/delete-button";

export function ResourceRow({
  id,
  title,
  category,
  stage,
  isActive,
}: {
  id: string;
  title: string;
  category: string | null;
  stage: string | null;
  isActive: boolean;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function toggle() {
    setIsSaving(true);
    await fetch(`/api/admin/resources/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    setIsSaving(false);
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-navy-100 p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-navy-900">{title}</p>
        <p className="text-xs text-foreground-muted">
          {[category, stage].filter(Boolean).join(" · ") || "Uncategorized"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-foreground-muted">
          <input type="checkbox" checked={isActive} disabled={isSaving} onChange={toggle} />
          Active
        </label>
        <DeleteButton endpoint={`/api/admin/resources/${id}`} label="" />
      </div>
    </div>
  );
}
