"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const OPTIONS = [
  { value: "2_DAYS_WEEK", label: "2 days/week" },
  { value: "3_DAYS_WEEK", label: "3 days/week" },
  { value: "5_DAYS_WEEK", label: "5 days/week" },
  { value: "CUSTOM", label: "Custom" },
];

/** ACCOUNTABILITY (spec Prompt 9): "Allow member to choose... Do not shame missed days." No streaks, no missed-day counts shown — just the preference itself. */
export function AccountabilityControl({
  businessId,
  cadence,
  customDays,
}: {
  businessId: string;
  cadence: string | null;
  customDays: number | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(cadence ?? "3_DAYS_WEEK");
  const [custom, setCustom] = useState(customDays ? String(customDays) : "3");
  const [busy, setBusy] = useState(false);

  async function save(nextValue: string, nextCustom?: string) {
    setBusy(true);
    await fetch("/api/progress/accountability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId,
        cadence: nextValue,
        customDays: nextValue === "CUSTOM" ? Number(nextCustom ?? custom) : undefined,
      }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={value}
        onValueChange={(v) => {
          setValue(v);
          save(v);
        }}
      >
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value === "CUSTOM" && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={7}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="h-9 w-16 rounded-lg border border-navy-200 px-2 text-sm"
          />
          <span className="text-xs text-foreground-muted">days/week</span>
          <Button type="button" size="sm" variant="outline" onClick={() => save("CUSTOM", custom)} disabled={busy}>
            Save
          </Button>
        </div>
      )}
    </div>
  );
}
