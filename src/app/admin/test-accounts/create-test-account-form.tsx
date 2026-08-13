"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";

type CreatedAccount = { loginEmail: string; password: string };

/**
 * CREATE A TEST ACCOUNT (Phase 7 continued) — POSTs to
 * /api/admin/test-accounts, then surfaces the generated login
 * credentials once (same "shown once" semantics as the reset-password
 * flow, since the plaintext password is never stored or retrievable
 * again after this).
 */
export function CreateTestAccountForm() {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedAccount | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setCreated(null);

    const res = await fetch("/api/admin/test-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });

    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong.");
      return;
    }
    const data = (await res.json()) as { loginEmail: string; password: string };
    setCreated({ loginEmail: data.loginEmail, password: data.password });
    setLabel("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (e.g. Trial Preview, Annual Preview)"
            required
          />
        </div>
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "Creating…" : "Create Test Account"}
        </Button>
      </form>
      {error && <Alert variant="danger">{error}</Alert>}
      {created && (
        <Alert variant="success">
          <div className="flex flex-col gap-1">
            <p className="font-medium">Test account created — save these credentials, they won&rsquo;t be shown again:</p>
            <p className="font-mono text-sm">
              Email: {created.loginEmail}
              <br />
              Password: {created.password}
            </p>
          </div>
        </Alert>
      )}
    </div>
  );
}
