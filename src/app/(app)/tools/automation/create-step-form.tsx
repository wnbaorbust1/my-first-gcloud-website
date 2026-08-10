"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CreateStepForm({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [trigger, setTrigger] = useState("");
  const [action, setAction] = useState("");
  const [tool, setTool] = useState("");
  const [timing, setTiming] = useState("");
  const [owner, setOwner] = useState("");
  const [message, setMessage] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await fetch("/api/tools/automation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, trigger, action, tool, timing, owner, message, nextStep }),
    });

    setIsSubmitting(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong.");
      return;
    }

    setTrigger("");
    setAction("");
    setTool("");
    setTiming("");
    setOwner("");
    setMessage("");
    setNextStep("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <Alert variant="danger">{error}</Alert>}

      <div>
        <Label htmlFor="auto-trigger">Trigger</Label>
        <Input
          id="auto-trigger"
          required
          value={trigger}
          onChange={(e) => setTrigger(e.target.value)}
          placeholder="e.g. New lead fills out contact form"
        />
      </div>
      <div>
        <Label htmlFor="auto-action">Action</Label>
        <Input
          id="auto-action"
          required
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="e.g. Send welcome email"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="auto-tool">Tool</Label>
          <Input id="auto-tool" value={tool} onChange={(e) => setTool(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="auto-timing">Timing</Label>
          <Input
            id="auto-timing"
            value={timing}
            onChange={(e) => setTiming(e.target.value)}
            placeholder="e.g. Immediately"
          />
        </div>
        <div>
          <Label htmlFor="auto-owner">Owner</Label>
          <Input id="auto-owner" value={owner} onChange={(e) => setOwner(e.target.value)} />
        </div>
      </div>

      <div>
        <Label htmlFor="auto-message">Message</Label>
        <Textarea
          id="auto-message"
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What gets sent/said"
        />
      </div>

      <div>
        <Label htmlFor="auto-next">Next Step</Label>
        <Input
          id="auto-next"
          value={nextStep}
          onChange={(e) => setNextStep(e.target.value)}
          placeholder="What happens after this"
        />
      </div>

      <Button type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting ? "Saving…" : "Add Step"}
      </Button>
    </form>
  );
}
