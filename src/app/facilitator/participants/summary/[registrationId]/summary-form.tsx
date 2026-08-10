"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface SummaryFormProps {
  registrationId: string;
  initial: {
    top3Priorities: string[];
    goal30Day: string;
    goal60Day: string;
    goal90Day: string;
    recommendedTasks: string[];
    recommendedResources: string[];
    nextSuggestedSessionType: string;
  };
}

const SESSION_TYPES = [
  { value: "", label: "Not set" },
  { value: "PASSION", label: "Blueprint Passion Session" },
  { value: "POWER", label: "Blueprint Power Session" },
  { value: "LEGACY", label: "Blueprint Legacy Session" },
  { value: "GROWTH", label: "Blueprint Growth Session" },
];

function linesToArray(text: string) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export function SummaryForm({ registrationId, initial }: SummaryFormProps) {
  const router = useRouter();
  const [top3Priorities, setTop3Priorities] = useState(initial.top3Priorities.join("\n"));
  const [goal30Day, setGoal30Day] = useState(initial.goal30Day);
  const [goal60Day, setGoal60Day] = useState(initial.goal60Day);
  const [goal90Day, setGoal90Day] = useState(initial.goal90Day);
  const [recommendedTasks, setRecommendedTasks] = useState(initial.recommendedTasks.join("\n"));
  const [recommendedResources, setRecommendedResources] = useState(
    initial.recommendedResources.join("\n"),
  );
  const [nextType, setNextType] = useState(initial.nextSuggestedSessionType);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSaved(false);

    const res = await fetch(`/api/sessions/registrations/${registrationId}/summary`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        top3Priorities: linesToArray(top3Priorities),
        goal30Day: goal30Day || undefined,
        goal60Day: goal60Day || undefined,
        goal90Day: goal90Day || undefined,
        recommendedTasks: linesToArray(recommendedTasks),
        recommendedResources: linesToArray(recommendedResources),
        nextSuggestedSessionType: nextType || undefined,
      }),
    });

    setIsSaving(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <Alert variant="danger">{error}</Alert>}
      {saved && <Alert variant="success">Summary saved.</Alert>}

      <div>
        <Label>Top 3 Priorities (one per line)</Label>
        <Textarea value={top3Priorities} onChange={(e) => setTop3Priorities(e.target.value)} rows={3} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Label>30-Day Goal</Label>
          <Textarea value={goal30Day} onChange={(e) => setGoal30Day(e.target.value)} rows={2} />
        </div>
        <div>
          <Label>60-Day Goal</Label>
          <Textarea value={goal60Day} onChange={(e) => setGoal60Day(e.target.value)} rows={2} />
        </div>
        <div>
          <Label>90-Day Goal</Label>
          <Textarea value={goal90Day} onChange={(e) => setGoal90Day(e.target.value)} rows={2} />
        </div>
      </div>

      <div>
        <Label>Recommended Tasks (one per line)</Label>
        <Textarea
          value={recommendedTasks}
          onChange={(e) => setRecommendedTasks(e.target.value)}
          rows={3}
        />
      </div>

      <div>
        <Label>Recommended Resources (one per line)</Label>
        <Textarea
          value={recommendedResources}
          onChange={(e) => setRecommendedResources(e.target.value)}
          rows={2}
        />
      </div>

      <div>
        <Label>Next Suggested Session</Label>
        <Select value={nextType} onValueChange={setNextType}>
          <SelectTrigger className="max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SESSION_TYPES.map((t) => (
              <SelectItem key={t.value || "none"} value={t.value || "none"}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" size="lg" disabled={isSaving} className="self-start">
        {isSaving ? "Saving…" : "Save Summary"}
      </Button>
    </form>
  );
}
