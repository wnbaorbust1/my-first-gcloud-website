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
import { LEAD_STAGE_LABELS, LEAD_STAGE_ORDER } from "@/lib/tools/meta";
import type { LeadStage } from "@/generated/prisma/enums";

export function LeadStageControl({ leadId, stage }: { leadId: string; stage: LeadStage }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function handleChange(value: string) {
    setIsSaving(true);
    await fetch(`/api/tools/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: value }),
    });
    setIsSaving(false);
    router.refresh();
  }

  return (
    <Select value={stage} onValueChange={handleChange} disabled={isSaving}>
      <SelectTrigger className="h-9 w-36 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LEAD_STAGE_ORDER.map((s) => (
          <SelectItem key={s} value={s}>
            {LEAD_STAGE_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
