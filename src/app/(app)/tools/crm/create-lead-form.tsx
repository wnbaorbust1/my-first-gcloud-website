"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CreateLeadForm({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [offer, setOffer] = useState("");
  const [value, setValue] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await fetch("/api/tools/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId,
        name,
        company,
        email,
        phone,
        offer,
        valueCents: value ? Math.round(Number(value) * 100) : undefined,
        nextAction,
        notes,
      }),
    });

    setIsSubmitting(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong.");
      return;
    }

    setName("");
    setCompany("");
    setEmail("");
    setPhone("");
    setOffer("");
    setValue("");
    setNextAction("");
    setNotes("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <Alert variant="danger">{error}</Alert>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="lead-name">Name</Label>
          <Input
            id="lead-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Jordan Rivera"
          />
        </div>
        <div>
          <Label htmlFor="lead-company">Business</Label>
          <Input
            id="lead-company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Their company"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="lead-email">Email</Label>
          <Input
            id="lead-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="lead-phone">Phone</Label>
          <Input id="lead-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="lead-offer">Offer</Label>
          <Input
            id="lead-offer"
            value={offer}
            onChange={(e) => setOffer(e.target.value)}
            placeholder="What they're interested in"
          />
        </div>
        <div>
          <Label htmlFor="lead-value">Value ($)</Label>
          <Input
            id="lead-value"
            type="number"
            min="0"
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="lead-next-action">Next Action</Label>
        <Input
          id="lead-next-action"
          value={nextAction}
          onChange={(e) => setNextAction(e.target.value)}
          placeholder="e.g. Send proposal by Friday"
        />
      </div>

      <div>
        <Label htmlFor="lead-notes">Notes</Label>
        <Textarea id="lead-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <Button type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting ? "Saving…" : "Add Lead"}
      </Button>
    </form>
  );
}
