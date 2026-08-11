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

const STATUSES = ["OPEN", "RESOLVED"];

export function SupportStatusControl({ requestId, status }: { requestId: string; status: string }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function handleChange(value: string) {
    setIsSaving(true);
    await fetch(`/api/admin/support/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: value }),
    });
    setIsSaving(false);
    router.refresh();
  }

  return (
    <Select value={status} onValueChange={handleChange} disabled={isSaving}>
      <SelectTrigger className="h-8 w-28 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
