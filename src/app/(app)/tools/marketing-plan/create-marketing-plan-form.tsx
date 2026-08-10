"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const FIELDS: Array<{
  key:
    | "goal"
    | "audience"
    | "channels"
    | "contentPillars"
    | "leadMagnet"
    | "campaign"
    | "metrics";
  label: string;
  placeholder?: string;
}> = [
  { key: "goal", label: "Goal", placeholder: "What this plan is meant to achieve" },
  { key: "audience", label: "Audience" },
  { key: "channels", label: "Channels", placeholder: "e.g. Instagram, Email, Referrals" },
  { key: "contentPillars", label: "Content Pillars" },
  { key: "leadMagnet", label: "Lead Magnet" },
  { key: "campaign", label: "Campaign" },
  { key: "metrics", label: "Metrics", placeholder: "How you'll know it's working" },
];

export function CreateMarketingPlanForm({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [cta, setCta] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await fetch("/api/tools/marketing-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, ...values, cta }),
    });

    setIsSubmitting(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong.");
      return;
    }

    setValues({});
    setCta("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <Alert variant="danger">{error}</Alert>}

      {FIELDS.map((field) => (
        <div key={field.key}>
          <Label htmlFor={`mp-${field.key}`}>{field.label}</Label>
          <Textarea
            id={`mp-${field.key}`}
            rows={2}
            value={values[field.key] ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
            placeholder={field.placeholder}
          />
        </div>
      ))}

      <div>
        <Label htmlFor="mp-cta">Call to Action</Label>
        <Input id="mp-cta" value={cta} onChange={(e) => setCta(e.target.value)} />
      </div>

      <Button type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting ? "Saving…" : "Save Marketing Plan"}
      </Button>
    </form>
  );
}
