"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";
import { Label } from "@/components/ui/label";
import { calculatePricingPlan, type PricingPlanResult } from "@/lib/money/pricing-builder";
import { formatCents } from "@/lib/money";

export function PricingBuilderForm({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [offerName, setOfferName] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("2");
  const [directCosts, setDirectCosts] = useState("20");
  const [desiredProfit, setDesiredProfit] = useState("2000");
  const [capacity, setCapacity] = useState("20");
  const [result, setResult] = useState<PricingPlanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function buildInputs() {
    return {
      offerName,
      deliveryTimeHours: Number(deliveryTime),
      directCostsCents: Math.round(Number(directCosts) * 100),
      desiredProfitCents: Math.round(Number(desiredProfit) * 100),
      capacityPerMonth: Number(capacity),
    };
  }

  function handleCalculate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!offerName.trim()) {
      setError("Give your offer a name first.");
      return;
    }
    setResult(calculatePricingPlan(buildInputs()));
  }

  async function handleSave() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/money/pricing-plan", {
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
      <div>
        <Label htmlFor="pb-offer">Offer</Label>
        <Input
          id="pb-offer"
          value={offerName}
          onChange={(e) => setOfferName(e.target.value)}
          placeholder="e.g. 1-hour coaching session"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="pb-time">Delivery Time (hours)</Label>
          <Input
            id="pb-time"
            type="number"
            min="0.1"
            step="any"
            value={deliveryTime}
            onChange={(e) => setDeliveryTime(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="pb-costs">Direct Costs per Delivery ($)</Label>
          <Input
            id="pb-costs"
            type="number"
            min="0"
            step="any"
            value={directCosts}
            onChange={(e) => setDirectCosts(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="pb-profit">Desired Monthly Profit ($)</Label>
          <Input
            id="pb-profit"
            type="number"
            min="0"
            step="any"
            value={desiredProfit}
            onChange={(e) => setDesiredProfit(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="pb-capacity">Capacity (units/month)</Label>
          <Input
            id="pb-capacity"
            type="number"
            min="1"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Button type="submit" variant="outline" className="self-start">
        Calculate
      </Button>

      {result && (
        <div className="mt-2 rounded-xl border border-gold-200 bg-gold-50/50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold-700">
            Estimated Sustainable Range
          </p>
          <p className="text-2xl font-semibold text-navy-900">
            {formatCents(result.estimatedLowCents)} – {formatCents(result.estimatedHighCents)}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-navy-700">{result.considerations}</p>
          <Button type="button" size="sm" className="mt-4" onClick={handleSave} disabled={busy}>
            {busy ? "Saving…" : "Save This Plan"}
          </Button>
        </div>
      )}
    </form>
  );
}
