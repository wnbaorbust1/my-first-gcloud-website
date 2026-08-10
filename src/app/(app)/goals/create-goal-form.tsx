"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CADENCE_LABELS, GOAL_TYPE_LABELS } from "@/lib/goals/meta";
import { GOAL_CADENCES, GOAL_TYPES } from "@/lib/validations/goal";

const NUMERIC_TYPES = new Set(["REVENUE", "PROFIT", "LEADS", "CUSTOMERS"]);

export function CreateGoalForm({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [cadence, setCadence] = useState<(typeof GOAL_CADENCES)[number]>("NINETY_DAY");
  const [goalType, setGoalType] = useState<(typeof GOAL_TYPES)[number]>("PERSONAL_CEO");
  const [targetValue, setTargetValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showTargetValue = NUMERIC_TYPES.has(goalType);
  const unit = goalType === "REVENUE" || goalType === "PROFIT" ? "$" : goalType === "LEADS" ? "leads" : "customers";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId,
        title,
        description,
        targetDate,
        cadence,
        goalType,
        targetValue: showTargetValue && targetValue ? Number(targetValue) : undefined,
        unit: showTargetValue && targetValue ? unit : undefined,
      }),
    });

    setIsSubmitting(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong.");
      return;
    }

    setTitle("");
    setDescription("");
    setTargetDate("");
    setTargetValue("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <Alert variant="danger">{error}</Alert>}

      <div>
        <Label htmlFor="goal-title">Goal</Label>
        <Input
          id="goal-title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Launch my consulting offer"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Cadence</Label>
          <Select value={cadence} onValueChange={(v) => setCadence(v as typeof cadence)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GOAL_CADENCES.map((c) => (
                <SelectItem key={c} value={c}>
                  {CADENCE_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Goal Type</Label>
          <Select value={goalType} onValueChange={(v) => setGoalType(v as typeof goalType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GOAL_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {GOAL_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {showTargetValue && (
        <div>
          <Label htmlFor="goal-target-value">
            Target ({unit === "$" ? "dollar amount" : unit})
          </Label>
          <Input
            id="goal-target-value"
            type="number"
            min="0"
            step="any"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            placeholder={unit === "$" ? "e.g. 10000" : "e.g. 25"}
            className="max-w-xs"
          />
        </div>
      )}

      <div>
        <Label htmlFor="goal-description">Notes (optional)</Label>
        <Textarea
          id="goal-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>

      <div>
        <Label htmlFor="goal-target-date">Target date (optional)</Label>
        <Input
          id="goal-target-date"
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <Button type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting ? "Saving…" : "Create My Goal"}
      </Button>
    </form>
  );
}
