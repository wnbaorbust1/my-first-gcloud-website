"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";
import { Label } from "@/components/ui/label";

interface Props {
  configId: string;
  stageThresholds: { PASSION: number; POWER: number; LEGACY: number };
  excellenceThreshold: number;
}

/** CONTENT MANAGEMENT (spec): "Thresholds can be modified." */
export function ScoringThresholdsForm({ configId, stageThresholds, excellenceThreshold }: Props) {
  const router = useRouter();
  const [passion, setPassion] = useState(String(stageThresholds.PASSION));
  const [power, setPower] = useState(String(stageThresholds.POWER));
  const [legacy, setLegacy] = useState(String(stageThresholds.LEGACY));
  const [excellence, setExcellence] = useState(String(excellenceThreshold));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setIsSubmitting(true);

    const res = await fetch(`/api/admin/scoring-config/${configId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stageThresholds: { PASSION: Number(passion), POWER: Number(power), LEGACY: Number(legacy) },
        excellenceThreshold: Number(excellence),
      }),
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <Alert variant="danger">{error}</Alert>}
      {saved && <Alert variant="success">Thresholds updated.</Alert>}
      <p className="text-sm text-foreground-muted">
        A stage scoring below its threshold becomes the next recommended session. When all three
        clear the excellence threshold, Blueprint recommends a GROWTH session instead.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div>
          <Label htmlFor="th-passion">Passion Threshold</Label>
          <Input id="th-passion" type="number" min="0" max="100" value={passion} onChange={(e) => setPassion(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="th-power">Power Threshold</Label>
          <Input id="th-power" type="number" min="0" max="100" value={power} onChange={(e) => setPower(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="th-legacy">Legacy Threshold</Label>
          <Input id="th-legacy" type="number" min="0" max="100" value={legacy} onChange={(e) => setLegacy(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="th-excellence">Excellence Threshold</Label>
          <Input
            id="th-excellence"
            type="number"
            min="0"
            max="100"
            value={excellence}
            onChange={(e) => setExcellence(e.target.value)}
          />
        </div>
      </div>
      <Button type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting ? "Saving…" : "Save Thresholds"}
      </Button>
    </form>
  );
}
