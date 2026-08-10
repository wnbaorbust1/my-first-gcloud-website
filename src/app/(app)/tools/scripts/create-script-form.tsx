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
import { SALES_SCRIPT_TYPE_LABELS, SALES_SCRIPT_TYPE_ORDER } from "@/lib/tools/meta";
import { SCRIPT_TEMPLATES } from "@/lib/tools/script-templates";
import { SALES_SCRIPT_TYPES } from "@/lib/validations/tools";
import type { SalesScriptType } from "@/generated/prisma/enums";

export function CreateScriptForm({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [type, setType] = useState<(typeof SALES_SCRIPT_TYPES)[number]>("DISCOVERY_CALL");
  const [title, setTitle] = useState(SALES_SCRIPT_TYPE_LABELS.DISCOVERY_CALL);
  const [content, setContent] = useState(SCRIPT_TEMPLATES.DISCOVERY_CALL);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleTypeChange(value: string) {
    const nextType = value as SalesScriptType;
    setType(nextType);
    setTitle(SALES_SCRIPT_TYPE_LABELS[nextType]);
    setContent(SCRIPT_TEMPLATES[nextType]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await fetch("/api/tools/scripts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, type, title, content }),
    });

    setIsSubmitting(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong.");
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <Alert variant="danger">{error}</Alert>}

      <div>
        <Label>Script Type</Label>
        <Select value={type} onValueChange={handleTypeChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SALES_SCRIPT_TYPE_ORDER.map((t) => (
              <SelectItem key={t} value={t}>
                {SALES_SCRIPT_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-1.5 text-xs text-foreground-muted">
          Choosing a type fills in a starter script below — make it yours.
        </p>
      </div>

      <div>
        <Label htmlFor="script-title">Title</Label>
        <Input id="script-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div>
        <Label htmlFor="script-content">Script</Label>
        <Textarea
          id="script-content"
          rows={10}
          required
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>

      <Button type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting ? "Saving…" : "Save Script"}
      </Button>
    </form>
  );
}
