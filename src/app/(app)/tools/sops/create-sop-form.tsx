"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const FIELDS: Array<{
  key: "purpose" | "trigger" | "owner" | "tools" | "steps" | "completionCriteria" | "exceptions";
  label: string;
  placeholder?: string;
  multiline?: boolean;
}> = [
  { key: "purpose", label: "Purpose", multiline: true, placeholder: "Why this SOP exists" },
  { key: "trigger", label: "Trigger", placeholder: "What starts this process" },
  { key: "owner", label: "Owner", placeholder: "Who's responsible" },
  { key: "tools", label: "Tools", placeholder: "What tools/software are used" },
  { key: "steps", label: "Steps", multiline: true, placeholder: "One step per line" },
  { key: "completionCriteria", label: "Completion Criteria", multiline: true },
  { key: "exceptions", label: "Exceptions", multiline: true },
];

export function CreateSopForm({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [reviewDate, setReviewDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await fetch("/api/tools/sops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, name, reviewDate, ...values }),
    });

    setIsSubmitting(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong.");
      return;
    }

    setName("");
    setValues({});
    setReviewDate("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <Alert variant="danger">{error}</Alert>}

      <div>
        <Label htmlFor="sop-name">SOP Name</Label>
        <Input
          id="sop-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Onboard a New Client"
        />
      </div>

      {FIELDS.map((field) => (
        <div key={field.key}>
          <Label htmlFor={`sop-${field.key}`}>{field.label}</Label>
          {field.multiline ? (
            <Textarea
              id={`sop-${field.key}`}
              rows={field.key === "steps" ? 5 : 2}
              value={values[field.key] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              placeholder={field.placeholder}
            />
          ) : (
            <Input
              id={`sop-${field.key}`}
              value={values[field.key] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              placeholder={field.placeholder}
            />
          )}
        </div>
      ))}

      <div>
        <Label htmlFor="sop-review-date">Review Date</Label>
        <Input
          id="sop-review-date"
          type="date"
          value={reviewDate}
          onChange={(e) => setReviewDate(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <Button type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting ? "Saving…" : "Save SOP"}
      </Button>
    </form>
  );
}
