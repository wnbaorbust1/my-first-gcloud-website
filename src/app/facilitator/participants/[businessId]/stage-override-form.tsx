"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const STAGE_OPTIONS = [
  { value: "PASSION", label: "Passion" },
  { value: "POWER", label: "Power" },
  { value: "LEGACY", label: "Legacy" },
  { value: "GROWTH", label: "Growth (all three strong)" },
];

/**
 * CORRECT STAGE ASSIGNMENT (Phase 7: Admin and Facilitator Controls) —
 * overrides Assessment.recommendedSessionType via
 * PATCH /api/facilitator/assessments/[assessmentId]/stage. The
 * system's own original computation is never lost — see
 * systemRecommendedSessionType, shown as read-only context above this
 * form on the participant page.
 */
export function StageOverrideForm({
  assessmentId,
  currentType,
}: {
  assessmentId: string;
  currentType: string;
}) {
  const router = useRouter();
  const [type, setType] = useState(currentType);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setIsSubmitting(true);

    const res = await fetch(`/api/facilitator/assessments/${assessmentId}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recommendedSessionType: type, note: note.trim() || undefined }),
    });

    setIsSubmitting(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong.");
      return;
    }
    setSaved(true);
    setNote("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      {error && <Alert variant="danger">{error}</Alert>}
      {saved && <Alert variant="success">Stage assignment corrected.</Alert>}
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[220px]">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGE_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" size="sm" variant="outline" disabled={isSubmitting || type === currentType}>
          {isSubmitting ? "Saving…" : "Correct Stage"}
        </Button>
      </div>
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Why does this need correcting? (optional, shown to other staff)"
        rows={2}
      />
    </form>
  );
}
