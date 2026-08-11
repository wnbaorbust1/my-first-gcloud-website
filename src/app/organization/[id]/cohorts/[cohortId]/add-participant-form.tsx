"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";
import { Label } from "@/components/ui/label";

export function AddParticipantForm({
  organizationId,
  cohortId,
}: {
  organizationId: string;
  cohortId: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const lookupRes = await fetch(
      `/api/organizations/${organizationId}/participants/lookup?email=${encodeURIComponent(email)}`,
    );
    if (!lookupRes.ok) {
      const data = (await lookupRes.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Couldn't find that participant.");
      setIsSubmitting(false);
      return;
    }
    const { businessId } = (await lookupRes.json()) as { businessId: string };

    const res = await fetch(`/api/organizations/${organizationId}/cohorts/${cohortId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId }),
    });

    setIsSubmitting(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong.");
      return;
    }
    setEmail("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      {error && (
        <Alert variant="danger" className="w-full">
          {error}
        </Alert>
      )}
      <div className="min-w-[220px] flex-1">
        <Label htmlFor="participant-email">Add participant by email</Label>
        <Input
          id="participant-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="participant@example.com"
        />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Adding…" : "Add to Cohort"}
      </Button>
    </form>
  );
}
