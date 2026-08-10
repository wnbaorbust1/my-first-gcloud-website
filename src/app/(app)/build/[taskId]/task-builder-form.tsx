"use client";

import { CheckCircle2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { InstructionField } from "@/lib/roadmap/task-templates";

interface TaskBuilderFormProps {
  taskId: string;
  instructions: InstructionField[];
  initialAnswers: Record<string, string>;
  isComplete: boolean;
}

export function TaskBuilderForm({
  taskId,
  instructions,
  initialAnswers,
  isComplete,
}: TaskBuilderFormProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<"draft" | "blueprint" | "complete" | null>(null);

  function setField(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSaveDraft(e: FormEvent) {
    e.preventDefault();
    setBusy("draft");
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/roadmap/tasks/${taskId}/response`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    setBusy(null);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong saving your draft.");
      return;
    }
    setMessage("Draft saved.");
    router.refresh();
  }

  async function handleSaveToBlueprint() {
    setBusy("blueprint");
    setError(null);
    setMessage(null);
    // Make sure the latest answers are persisted before pushing to the Blueprint.
    await fetch(`/api/roadmap/tasks/${taskId}/response`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    const res = await fetch(`/api/roadmap/tasks/${taskId}/save-to-blueprint`, { method: "POST" });
    setBusy(null);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong saving to your Blueprint.");
      return;
    }
    setMessage("Saved to My Blueprint.");
    router.refresh();
  }

  async function handleMarkComplete() {
    setBusy("complete");
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/roadmap/tasks/${taskId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    setBusy(null);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong marking this complete.");
      return;
    }
    router.push("/build");
    router.refresh();
  }

  return (
    <form onSubmit={handleSaveDraft} className="flex flex-col gap-6">
      {instructions.map((field, i) => (
        <div key={field.key}>
          <Label htmlFor={field.key}>
            Step {i + 1}: {field.label}
          </Label>
          <p className="mb-2 text-xs text-foreground-muted">{field.prompt}</p>
          {field.type === "short_text" ? (
            <Input
              id={field.key}
              value={answers[field.key] ?? ""}
              onChange={(e) => setField(field.key, e.target.value)}
              disabled={isComplete}
            />
          ) : (
            <Textarea
              id={field.key}
              rows={3}
              value={answers[field.key] ?? ""}
              onChange={(e) => setField(field.key, e.target.value)}
              disabled={isComplete}
            />
          )}
        </div>
      ))}

      {error && <Alert variant="danger">{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}

      {!isComplete && (
        <div className="flex flex-wrap items-center gap-3 border-t border-navy-100 pt-5">
          <Button type="submit" variant="outline" disabled={busy !== null}>
            {busy === "draft" ? "Saving…" : "Save Draft"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveToBlueprint}
            disabled={busy !== null}
          >
            {busy === "blueprint" ? "Saving…" : "Save to My Blueprint"}
          </Button>
          <Button
            type="button"
            variant="gold"
            onClick={handleMarkComplete}
            disabled={busy !== null}
            className="ml-auto"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {busy === "complete" ? "Saving…" : "Mark Complete"}
          </Button>
        </div>
      )}

      {isComplete && (
        <Alert variant="success" className="items-center">
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            This task is complete and saved to your Blueprint.
          </span>
        </Alert>
      )}
    </form>
  );
}
