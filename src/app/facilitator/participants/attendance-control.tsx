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

const OPTIONS = [
  { value: "REGISTERED", label: "Registered" },
  { value: "WAITLISTED", label: "Waitlisted" },
  { value: "ATTENDED", label: "Attended" },
  { value: "NO_SHOW", label: "No-Show" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const MARKABLE = new Set(["ATTENDED", "NO_SHOW", "COMPLETED", "CANCELLED"]);

export function AttendanceControl({
  registrationId,
  status,
}: {
  registrationId: string;
  status: string;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function handleChange(value: string) {
    if (!MARKABLE.has(value)) return; // REGISTERED/WAITLISTED aren't set via this control
    setIsSaving(true);
    await fetch(`/api/sessions/registrations/${registrationId}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: value }),
    });
    setIsSaving(false);
    router.refresh();
  }

  return (
    <Select value={status} onValueChange={handleChange} disabled={isSaving}>
      <SelectTrigger className="h-9 w-40 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} disabled={!MARKABLE.has(opt.value) && opt.value !== status}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
