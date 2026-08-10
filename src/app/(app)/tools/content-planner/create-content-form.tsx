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
import { Textarea } from "@/components/ui/textarea";
import { CONTENT_CADENCE_LABELS } from "@/lib/tools/meta";
import { CONTENT_CADENCES } from "@/lib/validations/tools";

export function CreateContentForm({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [cadence, setCadence] = useState<(typeof CONTENT_CADENCES)[number]>("WEEKLY");
  const [idea, setIdea] = useState("");
  const [platform, setPlatform] = useState("");
  const [cta, setCta] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await fetch("/api/tools/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, cadence, idea, platform, cta, plannedDate }),
    });

    setIsSubmitting(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong.");
      return;
    }

    setIdea("");
    setPlatform("");
    setCta("");
    setPlannedDate("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <Alert variant="danger">{error}</Alert>}

      <div>
        <Label htmlFor="content-idea">Content Idea</Label>
        <Textarea
          id="content-idea"
          rows={2}
          required
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="What will you post?"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Label>Cadence</Label>
          <Select value={cadence} onValueChange={(v) => setCadence(v as typeof cadence)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTENT_CADENCES.map((c) => (
                <SelectItem key={c} value={c}>
                  {CONTENT_CADENCE_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="content-platform">Platform</Label>
          <Input
            id="content-platform"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            placeholder="e.g. Instagram"
          />
        </div>
        <div>
          <Label htmlFor="content-date">Planned Date</Label>
          <Input
            id="content-date"
            type="date"
            value={plannedDate}
            onChange={(e) => setPlannedDate(e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="content-cta">Call to Action</Label>
        <Input id="content-cta" value={cta} onChange={(e) => setCta(e.target.value)} />
      </div>

      <Button type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting ? "Saving…" : "Add to Content Plan"}
      </Button>
    </form>
  );
}
