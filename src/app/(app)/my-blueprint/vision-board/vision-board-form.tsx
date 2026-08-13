"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface VisionBoardProfileValues {
  vibes: string;
  resourcesHave: string;
  resourcesNeed: string;
  bmcKeyPartners: string;
  bmcKeyActivities: string;
  bmcValue: string;
  bmcCustomers: string;
  bmcChannels: string;
  bmcRevenueStreams: string;
  bmcCostStructure: string;
  dailyAffirmations: string;
  accountabilityPartnerName: string;
  accountabilityPartnerContact: string;
  accountabilityCommitment: string;
}

function Field({
  id,
  label,
  hint,
  value,
  onChange,
  multiline,
  rows = 2,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {hint && <p className="mb-1 text-xs text-foreground-muted">{hint}</p>}
      {multiline ? (
        <Textarea id={id} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

export function VisionBoardForm({
  businessId,
  initial,
}: {
  businessId: string;
  initial: VisionBoardProfileValues;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function set<K extends keyof VisionBoardProfileValues>(key: K, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
    setSaved(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await fetch("/api/my-blueprint/vision-board", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, ...values }),
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {error && <Alert variant="danger">{error}</Alert>}
      {saved && <Alert variant="success">Saved.</Alert>}

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold text-navy-900">My Vibes</h2>
        <Field
          id="vibes"
          label="How would you describe yourself?"
          hint="Short traits, comma-separated — e.g. Ambitious, Passionate, Creative"
          value={values.vibes}
          onChange={(v) => set("vibes", v)}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold text-navy-900">Resources</h2>
        <Field
          id="resourcesHave"
          label="What I Have"
          hint="One per line — e.g. Experience, Loyal Network, AI Knowledge"
          multiline
          value={values.resourcesHave}
          onChange={(v) => set("resourcesHave", v)}
        />
        <Field
          id="resourcesNeed"
          label="What I Need"
          hint="One per line — e.g. Tech Team Support, Investors, Marketing Team"
          multiline
          value={values.resourcesNeed}
          onChange={(v) => set("resourcesNeed", v)}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold text-navy-900">Business Model Canvas</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="bmcKeyPartners" label="Key Partners" multiline value={values.bmcKeyPartners} onChange={(v) => set("bmcKeyPartners", v)} />
          <Field id="bmcKeyActivities" label="Key Activities" multiline value={values.bmcKeyActivities} onChange={(v) => set("bmcKeyActivities", v)} />
          <Field id="bmcValue" label="Value Proposition" multiline value={values.bmcValue} onChange={(v) => set("bmcValue", v)} />
          <Field id="bmcCustomers" label="Customers" multiline value={values.bmcCustomers} onChange={(v) => set("bmcCustomers", v)} />
          <Field id="bmcChannels" label="Channels" multiline value={values.bmcChannels} onChange={(v) => set("bmcChannels", v)} />
          <Field id="bmcRevenueStreams" label="Revenue Streams" multiline value={values.bmcRevenueStreams} onChange={(v) => set("bmcRevenueStreams", v)} />
          <Field id="bmcCostStructure" label="Cost Structure" multiline value={values.bmcCostStructure} onChange={(v) => set("bmcCostStructure", v)} />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold text-navy-900">Accountability Partner</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="accountabilityPartnerName" label="Name" value={values.accountabilityPartnerName} onChange={(v) => set("accountabilityPartnerName", v)} />
          <Field id="accountabilityPartnerContact" label="Phone or Email" value={values.accountabilityPartnerContact} onChange={(v) => set("accountabilityPartnerContact", v)} />
        </div>
        <Field
          id="accountabilityCommitment"
          label="My Commitment"
          hint="e.g. Take consistent action and share my progress"
          multiline
          value={values.accountabilityCommitment}
          onChange={(v) => set("accountabilityCommitment", v)}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold text-navy-900">Daily Affirmations</h2>
        <Field
          id="dailyAffirmations"
          label="Your affirmations"
          hint="One per line — e.g. I am capable. I am building my legacy."
          multiline
          rows={5}
          value={values.dailyAffirmations}
          onChange={(v) => set("dailyAffirmations", v)}
        />
      </section>

      <Button type="submit" disabled={isSubmitting} size="lg" className="self-start">
        {isSubmitting ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
