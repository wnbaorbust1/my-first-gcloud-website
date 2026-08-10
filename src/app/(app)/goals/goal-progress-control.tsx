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

const OPTIONS = [0, 25, 50, 75, 100];

export function GoalProgressControl({
  goalId,
  progressPercent,
}: {
  goalId: string;
  progressPercent: number;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function handleChange(value: string) {
    const progress = Number(value);
    setIsSaving(true);
    await fetch(`/api/goals/${goalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        progressPercent: progress,
        ...(progress === 100 ? { status: "COMPLETED" } : {}),
      }),
    });
    setIsSaving(false);
    router.refresh();
  }

  return (
    <Select value={String(progressPercent)} onValueChange={handleChange} disabled={isSaving}>
      <SelectTrigger className="h-9 w-28 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((v) => (
          <SelectItem key={v} value={String(v)}>
            {v}%
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
