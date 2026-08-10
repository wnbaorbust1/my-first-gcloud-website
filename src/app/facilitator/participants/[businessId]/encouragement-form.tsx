"use client";

import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/** FACILITATOR ACTIONS (spec): "Send Encouragement" — a real Notification, not a note only staff can see. */
export function EncouragementForm({ businessId }: { businessId: string }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setError(null);
    setSent(false);
    setIsSubmitting(true);

    const res = await fetch("/api/facilitator/encouragement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, message }),
    });

    setIsSubmitting(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong.");
      return;
    }
    setMessage("");
    setSent(true);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      {error && <Alert variant="danger">{error}</Alert>}
      {sent && <Alert variant="success">Sent — it&apos;ll show up on their Dashboard.</Alert>}
      <Textarea
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          setSent(false);
        }}
        placeholder="You're making real progress — keep going…"
        rows={2}
      />
      <Button type="submit" size="sm" variant="outline" disabled={isSubmitting} className="self-start">
        {isSubmitting ? "Sending…" : "Send Encouragement"}
      </Button>
    </form>
  );
}
