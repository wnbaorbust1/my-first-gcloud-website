"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CONTENT_STATUS_LABELS } from "@/lib/tools/meta";
import { CONTENT_STATUSES } from "@/lib/validations/tools";
import type { ContentStatus } from "@/generated/prisma/enums";

export function ContentStatusControl({ itemId, status }: { itemId: string; status: ContentStatus }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function handleChange(value: string) {
    setIsSaving(true);
    await fetch(`/api/tools/content/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: value }),
    });
    setIsSaving(false);
    router.refresh();
  }

  return (
    <Select value={status} onValueChange={handleChange} disabled={isSaving}>
      <SelectTrigger className="h-9 w-32 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CONTENT_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {CONTENT_STATUS_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
