"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CheckInFormProps {
  businessId: string;
  initial: {
    completed: string;
    slowedDown: string;
    biggestWin: string;
    biggestChallenge: string;
    leads: string;
    sales: string;
    revenue: string;
    nextWeekFocus: string;
  };
  weekOfLabel: string;
  alreadySubmitted: boolean;
}

/** WEEKLY CEO CHECK-IN (spec Prompt 9) — the exact 8 questions, one form, save or update. */
export function CheckInForm({ businessId, initial, weekOfLabel, alreadySubmitted }: CheckInFormProps) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function setField<K extends keyof typeof values>(key: K, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/progress/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId,
        completed: values.completed,
        slowedDown: values.slowedDown,
        biggestWin: values.biggestWin,
        biggestChallenge: values.biggestChallenge,
        leads: values.leads ? Number(values.leads) : undefined,
        sales: values.sales ? Number(values.sales) : undefined,
        revenueCents: values.revenue ? Math.round(Number(values.revenue) * 100) : undefined,
        nextWeekFocus: values.nextWeekFocus,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong.");
      return;
    }
    setMessage(alreadySubmitted ? "Check-in updated." : "Check-in saved.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
        Week of {weekOfLabel}
      </p>

      <div>
        <Label htmlFor="ci-completed">What did you complete?</Label>
        <Textarea id="ci-completed" rows={2} value={values.completed} onChange={(e) => setField("completed", e.target.value)} />
      </div>
      <div>
        <Label htmlFor="ci-slowed">What slowed you down?</Label>
        <Textarea id="ci-slowed" rows={2} value={values.slowedDown} onChange={(e) => setField("slowedDown", e.target.value)} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ci-win">Biggest win?</Label>
          <Textarea id="ci-win" rows={2} value={values.biggestWin} onChange={(e) => setField("biggestWin", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ci-challenge">Biggest challenge?</Label>
          <Textarea id="ci-challenge" rows={2} value={values.biggestChallenge} onChange={(e) => setField("biggestChallenge", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="ci-leads">Leads?</Label>
          <Input id="ci-leads" type="number" min="0" value={values.leads} onChange={(e) => setField("leads", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ci-sales">Sales?</Label>
          <Input id="ci-sales" type="number" min="0" value={values.sales} onChange={(e) => setField("sales", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ci-revenue">Revenue ($)?</Label>
          <Input id="ci-revenue" type="number" min="0" step="any" value={values.revenue} onChange={(e) => setField("revenue", e.target.value)} />
        </div>
      </div>

      <div>
        <Label htmlFor="ci-next">What needs attention next week?</Label>
        <Textarea id="ci-next" rows={2} value={values.nextWeekFocus} onChange={(e) => setField("nextWeekFocus", e.target.value)} />
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}

      <Button type="submit" disabled={busy} className="self-start">
        {busy ? "Saving…" : alreadySubmitted ? "Update Check-In" : "Save Check-In"}
      </Button>
    </form>
  );
}
