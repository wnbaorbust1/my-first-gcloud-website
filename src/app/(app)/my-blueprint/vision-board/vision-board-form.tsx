"use client";

import { Plus, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AiSuggestedBadge } from "@/components/blueprint/worksheet";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EditableSectionKey, SectionSources } from "@/lib/validations/vision-board-data";

/**
 * FORM STATE — kept as flat strings (mostly "one per line" for list
 * fields), the same simple text-editing UX as before restructuring.
 * Only `handleSubmit` reshapes this into the structured JSON
 * `VisionBoardData` sections the API stores — see
 * src/lib/validations/vision-board-data.ts. Keeping arrays as plain
 * multi-line text while editing (rather than a real `string[]` state
 * split/joined on every keystroke) avoids a real bug class: splitting
 * on every change and re-deriving the textarea's value from that array
 * "eats" the Enter key the instant a new blank line is typed, since the
 * freshly-split array immediately drops trailing empty lines.
 */
export interface VisionBoardProfileValues {
  myStoryName: string;
  myStoryBusinesses: string;
  myStoryPassionStatement: string;
  myStorySuperpowers: string;
  myWhyStatement: string;
  myWhyProblemToSolve: string;
  myWhyPeopleToHelp: string;
  legacyStatement: string;
  legacyImpactGroups: string;
  blueprintPriorities: string;
  actionPlanThisWeek: string;
  actionPlanThisMonth: string;
  actionPlanFirstStep: string;
  resourcesHave: string;
  resourcesNeed: string;
  bmcKeyPartners: string;
  bmcKeyActivities: string;
  bmcValue: string;
  bmcCustomers: string;
  bmcChannels: string;
  bmcRevenueStreams: string;
  bmcCostStructure: string;
  vibes: string;
  affirmations: string;
  accountabilityPartnerName: string;
  accountabilityPartnerContact: string;
  accountabilityFrequency: string;
  accountabilityMethod: string;
  accountabilityCommitment: string;
}

/** One "My Blueprint" 90-day goal row — a real repeater, since goal + its steps are a pair, not flattenable into one textarea. */
export interface Next90DaysRow {
  goal: string;
  actionSteps: string;
}

/** Which section a given form field belongs to, for clearing that section's "AI Suggested" badge the moment a member edits it directly. */
const FIELD_TO_SECTION: Partial<Record<keyof VisionBoardProfileValues, EditableSectionKey>> = {
  myStoryName: "myStory",
  myStoryBusinesses: "myStory",
  myStoryPassionStatement: "myStory",
  myStorySuperpowers: "myStory",
  myWhyStatement: "myWhy",
  myWhyProblemToSolve: "myWhy",
  myWhyPeopleToHelp: "myWhy",
  legacyStatement: "legacy",
  legacyImpactGroups: "legacy",
  actionPlanThisWeek: "actionPlan",
  actionPlanThisMonth: "actionPlan",
  actionPlanFirstStep: "actionPlan",
  affirmations: "affirmations",
};

interface GeneratedDraft {
  myStory: { passionStatement: string | null; superpowers: string[] };
  myWhy: { whyStatement: string | null; problemToSolve: string | null; peopleToHelp: string[] };
  legacy: { legacyStatement: string | null; impactGroups: string[] };
  actionPlan: { thisWeek: string[]; thisMonth: string[]; firstStep: string | null };
  affirmations: string[];
}

/** Splits "one per line" text into a trimmed, non-empty, length-capped array — the inverse of `.join("\n")`. */
function toLines(text: string, max: number): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, max);
}

/** Empty string -> null, matching the nullable-string convention every section schema uses. */
function toNullable(text: string): string | null {
  const trimmed = text.trim();
  return trimmed ? trimmed : null;
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
  initialNext90Days,
  initialSectionSources,
}: {
  businessId: string;
  initial: VisionBoardProfileValues;
  initialNext90Days: Next90DaysRow[];
  /** Which sections currently hold an accepted AI/rules-based draft vs. member-typed content (Phase 3: AI Blueprint Generator). */
  initialSectionSources?: SectionSources;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [next90Days, setNext90Days] = useState<Next90DaysRow[]>(
    initialNext90Days.length ? initialNext90Days : [{ goal: "", actionSteps: "" }],
  );
  const [sectionSources, setSectionSources] = useState<SectionSources>(initialSectionSources ?? {});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);

  function set<K extends keyof VisionBoardProfileValues>(key: K, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
    setSaved(false);
    // Editing any field in an AI-sourced section is direct authorship
    // again — clear its badge immediately rather than waiting for a
    // reload, matching what the next Save will actually persist.
    const section = FIELD_TO_SECTION[key];
    if (section && sectionSources[section]) {
      setSectionSources((prev) => {
        const next = { ...prev };
        delete next[section];
        return next;
      });
    }
  }

  function setNext90DaysRow(index: number, field: keyof Next90DaysRow, v: string) {
    setNext90Days((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: v } : row)));
    setSaved(false);
  }

  // AI DRAFT ASSIST (Vision Board & Blueprint Generator, structured-storage
  // follow-up, audited 2026-08-13): calls the structured-JSON generation
  // endpoint and drops any drafted leaf field straight into this form's
  // *unsaved* local state — nothing reaches VisionBoardProfile until the
  // member reviews it here and hits Save, same as typing it themselves.
  // A leaf the model returned null/empty for (no grounded content to
  // draft) is left untouched rather than overwriting whatever the member
  // already had.
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

    const data = (await res.json()) as {
      generation: { payload: GeneratedDraft };
      source: "ai" | "rules_based";
    };
    const draft = data.generation.payload;

    const filled: string[] = [];
    if (draft.myStory.passionStatement) filled.push("My Story");
    if (draft.myStory.superpowers.length) filled.push("Superpowers");
    if (draft.myWhy.whyStatement || draft.myWhy.problemToSolve || draft.myWhy.peopleToHelp.length)
      filled.push("My Why");
    if (draft.legacy.legacyStatement || draft.legacy.impactGroups.length) filled.push("Legacy");
    if (draft.actionPlan.thisWeek.length || draft.actionPlan.thisMonth.length || draft.actionPlan.firstStep)
      filled.push("Action Plan");
    if (draft.affirmations.length) filled.push("Daily Affirmations");

    setValues((prev) => ({
      ...prev,
      ...(draft.myStory.passionStatement ? { myStoryPassionStatement: draft.myStory.passionStatement } : {}),
      ...(draft.myStory.superpowers.length ? { myStorySuperpowers: draft.myStory.superpowers.join("\n") } : {}),
      ...(draft.myWhy.whyStatement ? { myWhyStatement: draft.myWhy.whyStatement } : {}),
      ...(draft.myWhy.problemToSolve ? { myWhyProblemToSolve: draft.myWhy.problemToSolve } : {}),
      ...(draft.myWhy.peopleToHelp.length ? { myWhyPeopleToHelp: draft.myWhy.peopleToHelp.join("\n") } : {}),
      ...(draft.legacy.legacyStatement ? { legacyStatement: draft.legacy.legacyStatement } : {}),
      ...(draft.legacy.impactGroups.length ? { legacyImpactGroups: draft.legacy.impactGroups.join("\n") } : {}),
      ...(draft.actionPlan.thisWeek.length ? { actionPlanThisWeek: draft.actionPlan.thisWeek.join("\n") } : {}),
      ...(draft.actionPlan.thisMonth.length ? { actionPlanThisMonth: draft.actionPlan.thisMonth.join("\n") } : {}),
      ...(draft.actionPlan.firstStep ? { actionPlanFirstStep: draft.actionPlan.firstStep } : {}),
      ...(draft.affirmations.length ? { affirmations: draft.affirmations.join("\n") } : {}),
    }));
    setSaved(false);
    // PHASE 3: AI Blueprint Generator — "mark AI-generated recommendations
    // clearly." Generation now always succeeds (a real AI call, or the
    // rules-based fallback when no key is configured or the model's
    // response was unusable) — the notice says plainly which one ran, so
    // a member never mistakes a template-assembled draft for an AI one.
    const sourceLabel = data.source === "ai" ? "Blueprint AI drafted" : "Auto-filled from your own data";
    setDraftNotice(
      filled.length
        ? `${sourceLabel}: ${filled.join(", ")}. Review and edit below, then Save to keep it.`
        : "Not enough grounded data yet to draft anything new — nothing was changed.",
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const body = {
      businessId,
      myStory: {
        name: toNullable(values.myStoryName),
        businesses: toLines(values.myStoryBusinesses, 10),
        passionStatement: toNullable(values.myStoryPassionStatement),
        superpowers: toLines(values.myStorySuperpowers, 10),
      },
      myWhy: {
        whyStatement: toNullable(values.myWhyStatement),
        problemToSolve: toNullable(values.myWhyProblemToSolve),
        peopleToHelp: toLines(values.myWhyPeopleToHelp, 10),
      },
      legacy: {
        legacyStatement: toNullable(values.legacyStatement),
        impactGroups: toLines(values.legacyImpactGroups, 10),
      },
      blueprint: {
        priorities: toLines(values.blueprintPriorities, 10),
        next90Days: next90Days
          .filter((row) => row.goal.trim())
          .slice(0, 10)
          .map((row) => ({ goal: row.goal.trim(), actionSteps: toLines(row.actionSteps, 10) })),
      },
      actionPlan: {
        thisWeek: toLines(values.actionPlanThisWeek, 10),
        thisMonth: toLines(values.actionPlanThisMonth, 10),
        firstStep: toNullable(values.actionPlanFirstStep),
      },
      resources: {
        have: toLines(values.resourcesHave, 15),
        need: toLines(values.resourcesNeed, 15),
      },
      businessModelCanvas: {
        keyPartners: toLines(values.bmcKeyPartners, 10),
        keyActivities: toLines(values.bmcKeyActivities, 10),
        value: toLines(values.bmcValue, 10),
        customers: toLines(values.bmcCustomers, 10),
        channels: toLines(values.bmcChannels, 10),
        revenueStreams: toLines(values.bmcRevenueStreams, 10),
        costStructure: toLines(values.bmcCostStructure, 10),
      },
      vibes: toLines(values.vibes, 15),
      affirmations: toLines(values.affirmations, 10),
      accountability: {
        partnerName: toNullable(values.accountabilityPartnerName),
        partnerContact: toNullable(values.accountabilityPartnerContact),
        frequency: toNullable(values.accountabilityFrequency),
        method: toNullable(values.accountabilityMethod),
        commitment: toNullable(values.accountabilityCommitment),
      },
    };

    const res = await fetch("/api/my-blueprint/vision-board", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-navy-900">
          My Story
          {sectionSources.myStory === "ai" && <AiSuggestedBadge />}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="myStoryName" label="Name" value={values.myStoryName} onChange={(v) => set("myStoryName", v)} />
          <Field
            id="myStoryBusinesses"
            label="Business / Idea"
            hint="One per line"
            multiline
            value={values.myStoryBusinesses}
            onChange={(v) => set("myStoryBusinesses", v)}
          />
        </div>
        <Field
          id="myStoryPassionStatement"
          label="How did your business come to be?"
          multiline
          rows={3}
          value={values.myStoryPassionStatement}
          onChange={(v) => set("myStoryPassionStatement", v)}
        />
        <Field
          id="myStorySuperpowers"
          label="My Superpowers"
          hint="What you're naturally good at — one per line"
          multiline
          value={values.myStorySuperpowers}
          onChange={(v) => set("myStorySuperpowers", v)}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-navy-900">
          My Why
          {sectionSources.myWhy === "ai" && <AiSuggestedBadge />}
        </h2>
        <Field
          id="myWhyStatement"
          label="Why does this matter to you?"
          multiline
          rows={3}
          value={values.myWhyStatement}
          onChange={(v) => set("myWhyStatement", v)}
        />
        <Field
          id="myWhyProblemToSolve"
          label="The problem I want to solve"
          multiline
          rows={2}
          value={values.myWhyProblemToSolve}
          onChange={(v) => set("myWhyProblemToSolve", v)}
        />
        <Field
          id="myWhyPeopleToHelp"
          label="Who I want to help"
          hint="One per line"
          multiline
          value={values.myWhyPeopleToHelp}
          onChange={(v) => set("myWhyPeopleToHelp", v)}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold text-navy-900">My Blueprint</h2>
        <Field
          id="blueprintPriorities"
          label="My Priorities"
          hint="One per line"
          multiline
          value={values.blueprintPriorities}
          onChange={(v) => set("blueprintPriorities", v)}
        />
        <div>
          <Label>My Next 90 Days</Label>
          <p className="mb-2 text-xs text-foreground-muted">A goal and its action steps, one row per goal.</p>
          <div className="flex flex-col gap-3">
            {next90Days.map((row, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-lg border border-navy-100 p-3 sm:flex-row">
                <div className="flex-1">
                  <Input
                    aria-label="Goal"
                    placeholder="Goal"
                    value={row.goal}
                    onChange={(e) => setNext90DaysRow(i, "goal", e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Textarea
                    aria-label="Action steps"
                    placeholder="Action steps — one per line"
                    rows={2}
                    value={row.actionSteps}
                    onChange={(e) => setNext90DaysRow(i, "actionSteps", e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Remove goal"
                  onClick={() => {
                    setNext90Days((prev) => prev.filter((_, idx) => idx !== i));
                    setSaved(false);
                  }}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => setNext90Days((prev) => [...prev, { goal: "", actionSteps: "" }])}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Goal
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-navy-900">
          Action Plan
          {sectionSources.actionPlan === "ai" && <AiSuggestedBadge />}
        </h2>
        <Field
          id="actionPlanThisWeek"
          label="This Week"
          hint="Concrete actions for the next 7 days — one per line"
          multiline
          rows={3}
          value={values.actionPlanThisWeek}
          onChange={(v) => set("actionPlanThisWeek", v)}
        />
        <Field
          id="actionPlanThisMonth"
          label="This Month"
          hint="Concrete actions for the next 30 days — one per line"
          multiline
          rows={3}
          value={values.actionPlanThisMonth}
          onChange={(v) => set("actionPlanThisMonth", v)}
        />
        <Field
          id="actionPlanFirstStep"
          label="My First Step"
          hint="The one thing to do first"
          value={values.actionPlanFirstStep}
          onChange={(v) => set("actionPlanFirstStep", v)}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-navy-900">
          Legacy
          {sectionSources.legacy === "ai" && <AiSuggestedBadge />}
        </h2>
        <Field
          id="legacyStatement"
          label="What lasting impact do you want this business to leave?"
          multiline
          rows={3}
          value={values.legacyStatement}
          onChange={(v) => set("legacyStatement", v)}
        />
        <Field
          id="legacyImpactGroups"
          label="Who will feel that impact?"
          hint="One per line — e.g. My Family, My Community, Future Generations"
          multiline
          value={values.legacyImpactGroups}
          onChange={(v) => set("legacyImpactGroups", v)}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold text-navy-900">My Vibes</h2>
        <Field
          id="vibes"
          label="How would you describe yourself?"
          hint="Short traits, one per line — e.g. Ambitious, Passionate, Creative"
          multiline
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
        <p className="text-xs text-foreground-muted">One item per line in each block.</p>
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
          <Field id="accountabilityFrequency" label="How Often" hint="e.g. Weekly" value={values.accountabilityFrequency} onChange={(v) => set("accountabilityFrequency", v)} />
          <Field id="accountabilityMethod" label="How We'll Connect" hint="e.g. Zoom, Phone Call" value={values.accountabilityMethod} onChange={(v) => set("accountabilityMethod", v)} />
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
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-navy-900">
          Daily Affirmations
          {sectionSources.affirmations === "ai" && <AiSuggestedBadge />}
        </h2>
        <Field
          id="affirmations"
          label="Your affirmations"
          hint="One per line — e.g. I am capable. I am building my legacy."
          multiline
          rows={5}
          value={values.affirmations}
          onChange={(v) => set("affirmations", v)}
        />
      </section>

      <Button type="submit" disabled={isSubmitting} size="lg" className="self-start">
        {isSubmitting ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
