"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";
import { Label } from "@/components/ui/label";

/**
 * SPONSORED ACCESS (spec Prompt 12). Takes the participant's email
 * (what an org admin actually has on hand) rather than a raw businessId
 * — resolves it server-side via the lookup endpoint, then sponsors that
 * business. `sponsoredUntil` is optional: leave it blank for a
 * never-expiring sponsorship, matching Phase 8's existing admin-grant
 * behavior.
 */
export function SponsorForm({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sponsoredUntil, setSponsoredUntil] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
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
    const { businessId, businessName } = (await lookupRes.json()) as {
      businessId: string;
      businessName: string;
    };

    const res = await fetch(`/api/organizations/${organizationId}/sponsor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, sponsoredUntil: sponsoredUntil || undefined }),
    });

    setIsSubmitting(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong.");
      return;
    }
    setSuccess(`Sponsored Blueprint access for ${businessName}.`);
    setEmail("");
    setSponsoredUntil("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      {error && (
        <Alert variant="danger" className="w-full">
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" className="w-full">
          {success}
        </Alert>
      )}
      <div className="min-w-[220px] flex-1">
        <Label htmlFor="sponsor-email">Participant email</Label>
        <Input
          id="sponsor-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="participant@example.com"
        />
      </div>
      <div className="min-w-[180px]">
        <Label htmlFor="sponsor-until">Sponsored through (optional)</Label>
        <Input
          id="sponsor-until"
          type="date"
          value={sponsoredUntil}
          onChange={(e) => setSponsoredUntil(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Sponsoring…" : "Sponsor Access"}
      </Button>
    </form>
  );
}
