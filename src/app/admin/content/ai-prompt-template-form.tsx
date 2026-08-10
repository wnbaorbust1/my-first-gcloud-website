"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function AiPromptTemplateForm({
  mode,
  label,
  currentFragment,
  isOverridden,
  isActive,
}: {
  mode: string;
  label: string;
  currentFragment: string;
  isOverridden: boolean;
  isActive: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(currentFragment);
  const [active, setActive] = useState(isActive);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setIsSubmitting(true);

    const res = await fetch("/api/admin/ai-prompt-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, systemPromptFragment: value, isActive: active }),
    });

    setIsSubmitting(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-navy-100 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-navy-900">
          {label}
          {isOverridden && (
            <span className="ml-2 rounded-full bg-gold-50 px-2 py-0.5 text-xs font-medium text-gold-700">
              Overridden
            </span>
          )}
        </p>
        <label className="flex items-center gap-1.5 text-xs text-foreground-muted">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active
        </label>
      </div>
      {error && <Alert variant="danger">{error}</Alert>}
      {saved && <Alert variant="success">Saved.</Alert>}
      <Textarea value={value} onChange={(e) => setValue(e.target.value)} rows={3} className="text-xs" />
      <Button type="submit" size="sm" variant="outline" disabled={isSubmitting} className="mt-2">
        {isSubmitting ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
