"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface VisionBoardProfileValues {
  myStory: string;
  myWhy: string;
  legacyImpact: string;
  actionPlanThisWeek: string;
  actionPlanThisMonth: string;
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

interface GeneratedDraft {
  myStory: string | null;
  myWhy: string | null;
  legacyImpact: string | null;
  actionPlanThisWeek: string | null;
  actionPlanThisMonth: string | null;
  dailyAffirmations: string[] | null;
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);

  function set<K extends keyof VisionBoardProfileValues>(key: K, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
    setSaved(false);
  }

  // AI DRAFT ASSIST (Vision Board & Blueprint Generator, audited
  // 2026-08-13): calls the structured-JSON generation endpoint
  // (src/app/api/blueprint/vision-board/generate) and drops any drafted
  // field straight into this form's *unsaved* local state — nothing
  // reaches VisionBoardProfile until the member reviews it here and
  // hits Save, same as typing it themselves. A field the model
  // returned null for (no grounded content to draft) is left untouched
  // rather than overwriting whatever the member already had.
  async function handleGenerate() {
    setError(null);
    setDraftNotice(null);
    setIsGenerating(true);

    const res = await fetch("/api/blueprint/vision-board/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId }),
    });

    setIsGenerating(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Couldn't generate a draft right now.");
      return;
    }

    const data = (await res.json()) as { generation: { payload: GeneratedDraft } };
    const draft = data.generation.payload;

    // Computed from `draft` directly, not as a side effect inside the
    // setValues updater below — React doesn't guarantee that updater runs
    // synchronously, so mutating an outer array from inside it and reading
    // that array right after is a real bug (the fields still applied
    // correctly; only the "what got drafted" notice text read stale/empty
    // state before the updater had actually run).
    const filled: string[] = [];
    if (draft.myStory) filled.push("My Story");
    if (draft.myWhy) filled.push("My Why");
    if (draft.legacyImpact) filled.push("Legacy");
    if (draft.actionPlanThisWeek) filled.push("Action Plan (this week)");
    if (draft.actionPlanThisMonth) filled.push("Action Plan (this month)");
    if (draft.dailyAffirmations?.length) filled.push("Daily Affirmations");

    setValues((prev) => ({
      ...prev,
      ...(draft.myStory ? { myStory: draft.myStory } : {}),
      ...(draft.myWhy ? { myWhy: draft.myWhy } : {}),
      ...(draft.legacyImpact ? { legacyImpact: draft.legacyImpact } : {}),
      ...(draft.actionPlanThisWeek ? { actionPlanThisWeek: draft.actionPlanThisWeek } : {}),
      ...(draft.actionPlanThisMonth ? { actionPlanThisMonth: draft.actionPlanThisMonth } : {}),
      ...(draft.dailyAffirmations?.length
        ? { dailyAffirmations: draft.dailyAffirmations.join("\n") }
        : {}),
    }));
    setSaved(false);
    setDraftNotice(
      filled.length
        ? `Drafted: ${filled.join(", ")}. Review and edit below, then Save to keep it.`
        : "Blueprint AI didn't have enough grounded context yet to draft anything new — nothing was changed.",
    );
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
      {draftNotice && <Alert variant="info">{draftNotice}</Alert>}

      <section className="flex flex-col gap-3 rounded-lg border border-navy-200 bg-navy-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-navy-900">AI Draft Assist</h2>
            <p className="text-sm text-foreground-muted">
              Draft My Story, My Why, Legacy, Action Plan, and Daily Affirmations from your real
              business data below. Nothing is saved until you review it and hit Save yourself.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating}>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {isGenerating ? "Drafting…" : "Generate My Draft"}
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold text-navy-900">My Story</h2>
        <Field
          id="myStory"
          label="How did your business come to be?"
          multiline
          rows={4}
          value={values.myStory}
          onChange={(v) => set("myStory", v)}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold text-navy-900">My Why</h2>
        <Field
          id="myWhy"
          label="What's the deeper motivation behind your business?"
          multiline
          rows={4}
          value={values.myWhy}
          onChange={(v) => set("myWhy", v)}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold text-navy-900">Legacy</h2>
        <Field
          id="legacyImpact"
          label="What lasting impact do you want this business to leave?"
          multiline
          rows={4}
          value={values.legacyImpact}
          onChange={(v) => set("legacyImpact", v)}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold text-navy-900">Action Plan</h2>
        <Field
          id="actionPlanThisWeek"
          label="This Week"
          hint="Concrete actions for the next 7 days"
          multiline
          rows={3}
          value={values.actionPlanThisWeek}
          onChange={(v) => set("actionPlanThisWeek", v)}
        />
        <Field
          id="actionPlanThisMonth"
          label="This Month"
          hint="Concrete actions for the next 30 days"
          multiline
          rows={3}
          value={values.actionPlanThisMonth}
          onChange={(v) => set("actionPlanThisMonth", v)}
        />
      </section>

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
