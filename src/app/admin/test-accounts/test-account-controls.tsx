"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type PreviewState = "trial" | "annual" | "expired";

const PREVIEW_BUTTONS: { state: PreviewState; label: string }[] = [
  { state: "trial", label: "Preview as: Free Trial" },
  { state: "annual", label: "Preview as: Annual Subscriber" },
  { state: "expired", label: "Preview as: Expired" },
];

/**
 * PER-ACCOUNT CONTROLS (Phase 7 continued) — set which membership stage
 * this test account's real Membership row reflects, reset its login
 * password (shown once), or delete the account entirely.
 */
export function TestAccountControls({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ loginEmail: string; password: string } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function setPreview(state: PreviewState) {
    setBusy(state);
    setError(null);
    setMessage(null);
    setCredentials(null);
    const res = await fetch(`/api/admin/test-accounts/${businessId}/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state }),
    });
    setBusy(null);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong.");
      return;
    }
    setMessage(`Now previewing: ${PREVIEW_BUTTONS.find((b) => b.state === state)?.label}.`);
    router.refresh();
  }

  async function resetPassword() {
    setBusy("reset");
    setError(null);
    setMessage(null);
    setCredentials(null);
    const res = await fetch(`/api/admin/test-accounts/${businessId}/reset-password`, { method: "POST" });
    setBusy(null);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong.");
      return;
    }
    const data = (await res.json()) as { loginEmail: string; password: string };
    setCredentials(data);
  }

  async function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setBusy("delete");
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/admin/test-accounts/${businessId}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {PREVIEW_BUTTONS.map((b) => (
          <Button
            key={b.state}
            type="button"
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={() => setPreview(b.state)}
          >
            {busy === b.state ? "Setting…" : b.label}
          </Button>
        ))}
        <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={resetPassword}>
          {busy === "reset" ? "Resetting…" : "Reset Password"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={confirmingDelete ? "danger" : "outline"}
          disabled={busy !== null}
          onClick={handleDelete}
        >
          {busy === "delete" ? "Deleting…" : confirmingDelete ? "Confirm Delete" : "Delete"}
        </Button>
      </div>
      {error && <Alert variant="danger">{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}
      {credentials && (
        <Alert variant="success">
          <div className="flex flex-col gap-1">
            <p className="font-medium">Password reset — save these credentials, they won&rsquo;t be shown again:</p>
            <p className="font-mono text-sm">
              Email: {credentials.loginEmail}
              <br />
              Password: {credentials.password}
            </p>
          </div>
        </Alert>
      )}
    </div>
  );
}
