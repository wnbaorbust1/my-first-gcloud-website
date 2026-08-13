"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const FIELDS: Array<{
  key: "audience" | "problem" | "outcome" | "features" | "benefits" | "deliverables";
  label: string;
  placeholder?: string;
}> = [
  { key: "audience", label: "Audience", placeholder: "Who this offer is for" },
  { key: "problem", label: "Problem", placeholder: "What problem it solves" },
  { key: "outcome", label: "Outcome", placeholder: "The result they get" },
  { key: "features", label: "Features", placeholder: "What's included" },
  { key: "benefits", label: "Benefits", placeholder: "Why the features matter" },
  { key: "deliverables", label: "Deliverables", placeholder: "Exactly what they receive" },
];

export function CreateOfferForm({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [price, setPrice] = useState("");
  const [cta, setCta] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await fetch("/api/tools/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId,
        name,
        ...values,
        priceCents: price ? Math.round(Number(price) * 100) : undefined,
        cta,
      }),
    });

    setIsSubmitting(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong.");
      return;
    }

    setName("");
    setValues({});
    setPrice("");
    setCta("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <Alert variant="danger">{error}</Alert>}

      <div>
        <Label htmlFor="offer-name">Offer Name</Label>
        <Input
          id="offer-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. 90-Day Business Builder Program"
        />
      </div>

      {FIELDS.map((field) => (
        <div key={field.key}>
          <Label htmlFor={`offer-${field.key}`}>{field.label}</Label>
          <Textarea
            id={`offer-${field.key}`}
            rows={2}
            value={values[field.key] ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
            placeholder={field.placeholder}
          />
        </div>
      ))}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="offer-price">Price ($)</Label>
          <Input
            id="offer-price"
            type="number"
            min="0"
            step="any"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="offer-cta">Call to Action</Label>
          <Input
            id="offer-cta"
            value={cta}
            onChange={(e) => setCta(e.target.value)}
            placeholder="e.g. Book a Free Consult"
          />
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting ? "Saving…" : "Save Offer & Update My Blueprint"}
      </Button>
    </form>
  );
}
