"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function SupportRequestForm() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, message }),
    });

    setIsSubmitting(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong. Please try again.");
      return;
    }
    setSubject("");
    setMessage("");
    setSuccess(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">Message sent. We&apos;ll follow up soon.</Alert>}
      <div>
        <Label htmlFor="support-subject">Subject</Label>
        <Input
          id="support-subject"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Billing question, can't reset my password"
        />
      </div>
      <div>
        <Label htmlFor="support-message">What&apos;s going on?</Label>
        <Textarea
          id="support-message"
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
        />
      </div>
      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Sending…" : "Send message"}
        </Button>
      </div>
    </form>
  );
}
