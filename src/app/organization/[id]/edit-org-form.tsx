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
import type { OrganizationModel } from "@/generated/prisma/models/Organization";
import { ORGANIZATION_TYPE_LABELS, ORGANIZATION_TYPE_ORDER } from "@/lib/organizations/meta";

/**
 * WHITE-LABEL READINESS (spec Prompt 12): captures logo/colors/domain/
 * branded-email fields so they're stored and displayed, without wiring
 * any actual routing/DNS or email-sender infrastructure — see the schema
 * doc comment on Organization for the full reasoning.
 */
export function EditOrganizationForm({ organization }: { organization: OrganizationModel }) {
  const router = useRouter();
  const [form, setForm] = useState({
    type: organization.type ?? "",
    logoUrl: organization.logoUrl ?? "",
    primaryColor: organization.primaryColor ?? "",
    secondaryColor: organization.secondaryColor ?? "",
    customDomain: organization.customDomain ?? "",
    brandedFromName: organization.brandedFromName ?? "",
    brandedFromEmail: organization.brandedFromEmail ?? "",
    allowIndividualParticipantData: organization.allowIndividualParticipantData,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await fetch(`/api/organizations/${organization.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Type</Label>
          <Select value={form.type || undefined} onValueChange={(v) => set("type", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a type" />
            </SelectTrigger>
            <SelectContent>
              {ORGANIZATION_TYPE_ORDER.map((t) => (
                <SelectItem key={t} value={t}>
                  {ORGANIZATION_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="logoUrl">Logo URL</Label>
          <Input id="logoUrl" value={form.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} placeholder="https://" />
        </div>
        <div>
          <Label htmlFor="primaryColor">Primary color</Label>
          <Input id="primaryColor" value={form.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} placeholder="#1B2A4A" />
        </div>
        <div>
          <Label htmlFor="secondaryColor">Secondary color</Label>
          <Input id="secondaryColor" value={form.secondaryColor} onChange={(e) => set("secondaryColor", e.target.value)} placeholder="#C9A24B" />
        </div>
        <div>
          <Label htmlFor="customDomain">Custom domain (not yet routed)</Label>
          <Input id="customDomain" value={form.customDomain} onChange={(e) => set("customDomain", e.target.value)} placeholder="learn.yourorg.org" />
        </div>
        <div>
          <Label htmlFor="brandedFromName">Branded &ldquo;from&rdquo; name</Label>
          <Input id="brandedFromName" value={form.brandedFromName} onChange={(e) => set("brandedFromName", e.target.value)} placeholder="Your Org Team" />
        </div>
        <div>
          <Label htmlFor="brandedFromEmail">Branded &ldquo;from&rdquo; email (not yet wired)</Label>
          <Input id="brandedFromEmail" value={form.brandedFromEmail} onChange={(e) => set("brandedFromEmail", e.target.value)} placeholder="team@yourorg.org" />
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-navy-100 p-4">
        <input
          type="checkbox"
          checked={form.allowIndividualParticipantData}
          onChange={(e) => set("allowIndividualParticipantData", e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-navy-300"
        />
        <span className="text-sm text-navy-700">
          <span className="font-medium text-navy-900">Show individual participant data.</span>{" "}
          Off by default — analytics show aggregate numbers only. Turn this on only when your
          program agreement allows viewing named participant records.
        </span>
      </label>

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
