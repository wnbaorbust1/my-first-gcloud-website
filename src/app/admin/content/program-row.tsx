"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProgramRow({
  id,
  name,
  description,
  isActive,
}: {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function toggle() {
    setIsSaving(true);
    await fetch(`/api/admin/programs/${id}`, {
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
        <p className="text-sm font-medium text-navy-900">{name}</p>
        {description && <p className="text-xs text-foreground-muted">{description}</p>}
      </div>
      <label className="flex items-center gap-1.5 text-xs text-foreground-muted">
        <input type="checkbox" checked={isActive} disabled={isSaving} onChange={toggle} />
        Active
      </label>
    </div>
  );
}
