"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setDevResetUrl(null);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = (await res.json().catch(() => null)) as
      | { message?: string; devResetUrl?: string }
      | null;

    setIsSubmitting(false);
    setMessage(data?.message ?? "Check your email for reset instructions.");
    if (data?.devResetUrl) setDevResetUrl(data.devResetUrl);
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-navy-900">
        Reset Your Password
      </h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      {message ? (
        <div className="mt-6">
          <Alert variant="success">{message}</Alert>
          {devResetUrl && (
            <Alert variant="info" className="mt-3">
              <p className="mb-1 font-medium">Dev mode — no email provider configured yet:</p>
              <Link href={devResetUrl} className="break-all underline">
                {devResetUrl}
              </Link>
            </Alert>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" size="lg" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? "Sending…" : "Send Reset Link"}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-foreground-muted">
        <Link href="/login" className="font-semibold text-navy-800 hover:underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
