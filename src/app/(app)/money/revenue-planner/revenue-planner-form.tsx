"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";
import { Label } from "@/components/ui/label";
import { calculateRevenuePlan, type RevenuePlanResult } from "@/lib/money/revenue-planner";
import { formatCents } from "@/lib/money";

export function RevenuePlannerForm({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [revenueGoal, setRevenueGoal] = useState("10000");
  const [offerPrice, setOfferPrice] = useState("500");
  const [conversionRate, setConversionRate] = useState("20");
  const [workingWeeks, setWorkingWeeks] = useState("48");
  const [result, setResult] = useState<RevenuePlanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function buildInputs() {
    return {
      revenueGoalCents: Math.round(Number(revenueGoal) * 100),
      offerPriceCents: Math.round(Number(offerPrice) * 100),
      conversionRatePercent: Number(conversionRate),
      workingWeeks: Number(workingWeeks),
    };
  }

  function handleCalculate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      setResult(calculateRevenuePlan(buildInputs()));
    } catch {
      setError("Check your numbers — something didn't compute.");
    }
  }

  async function handleSave() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/money/revenue-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, ...buildInputs() }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong saving this plan.");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleCalculate} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="rp-goal">Revenue Goal ($)</Label>
          <Input
            id="rp-goal"
            type="number"
            min="1"
            step="any"
            value={revenueGoal}
            onChange={(e) => setRevenueGoal(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="rp-price">Offer Price ($)</Label>
          <Input
            id="rp-price"
            type="number"
            min="1"
            step="any"
            value={offerPrice}
            onChange={(e) => setOfferPrice(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="rp-conversion">Conversion Rate (%)</Label>
          <Input
            id="rp-conversion"
            type="number"
            min="0.1"
            max="100"
            step="any"
            value={conversionRate}
            onChange={(e) => setConversionRate(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="rp-weeks">Working Weeks</Label>
          <Input
            id="rp-weeks"
            type="number"
            min="1"
            max="52"
            value={workingWeeks}
            onChange={(e) => setWorkingWeeks(e.target.value)}
          />
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Button type="submit" variant="outline" className="self-start">
        Calculate
      </Button>

      {result && (
        <div className="mt-2 rounded-xl border border-gold-200 bg-gold-50/50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gold-700">
            Your Plan
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-foreground-muted">Sales Needed</p>
              <p className="text-lg font-semibold text-navy-900">{result.salesNeeded}</p>
            </div>
            <div>
              <p className="text-xs text-foreground-muted">Leads Needed</p>
              <p className="text-lg font-semibold text-navy-900">{result.leadsNeeded}</p>
            </div>
            <div>
              <p className="text-xs text-foreground-muted">Weekly Target</p>
              <p className="text-lg font-semibold text-navy-900">
                {formatCents(result.weeklyTargetCents)}
              </p>
            </div>
            <div>
              <p className="text-xs text-foreground-muted">Monthly Target</p>
              <p className="text-lg font-semibold text-navy-900">
                {formatCents(result.monthlyTargetCents)}
              </p>
            </div>
          </div>
          <Button type="button" size="sm" className="mt-4" onClick={handleSave} disabled={busy}>
            {busy ? "Saving…" : "Save This Plan"}
          </Button>
        </div>
      )}
    </form>
  );
}
