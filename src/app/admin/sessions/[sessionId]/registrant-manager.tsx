"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";
import { Label } from "@/components/ui/label";

interface Registrant {
  id: string;
  status: string;
  waitlistPosition: number | null;
  user: { firstName: string; lastName: string; email: string };
  business: { name: string } | null;
}

/**
 * MANUALLY ADD/REMOVE CLIENTS FROM A SESSION (Phase 7 continued) — wraps
 * POST/DELETE /api/admin/sessions/[id]/registrations, which reuse the
 * same registerForSession/cancelRegistration logic real members' signup
 * and cancel flows use (capacity, waitlist, and promotion all included).
 */
export function RegistrantManager({ sessionId, registrants }: { sessionId: string; registrants: Registrant[] }) {
  const router = useRouter();
  const [ownerEmail, setOwnerEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy("add");
    const res = await fetch(`/api/admin/sessions/${sessionId}/registrations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerEmail }),
    });
    setBusy(null);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong.");
      return;
    }
    setOwnerEmail("");
    router.refresh();
  }

  async function handleRemove(registrationId: string) {
    setError(null);
    setBusy(registrationId);
    const res = await fetch(`/api/admin/sessions/${sessionId}/registrations/${registrationId}`, {
      method: "DELETE",
    });
    setBusy(null);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <Alert variant="danger">{error}</Alert>}

      {registrants.length === 0 ? (
        <p className="text-sm text-foreground-muted">No registrants yet.</p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm">
          {registrants.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-navy-100 px-3 py-2"
            >
              <span>
                <span className="font-medium text-navy-900">
                  {r.user.firstName} {r.user.lastName}
                </span>{" "}
                <span className="text-foreground-muted">
                  ({r.user.email}){r.business ? ` · ${r.business.name}` : ""} ·{" "}
                  {r.status === "WAITLISTED" && r.waitlistPosition
                    ? `WAITLISTED (#${r.waitlistPosition})`
                    : r.status}
                </span>
              </span>
              <button
                type="button"
                onClick={() => handleRemove(r.id)}
                disabled={busy === r.id}
                className="text-xs font-medium text-danger hover:underline disabled:opacity-50"
              >
                {busy === r.id ? "Removing…" : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <Label htmlFor="add-registrant-email">Add Client by Owner Email</Label>
          <Input
            id="add-registrant-email"
            type="email"
            required
            placeholder="owner@example.com"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
          />
        </div>
        <Button type="submit" size="sm" disabled={busy === "add"}>
          {busy === "add" ? "Adding…" : "Add"}
        </Button>
      </form>
    </div>
  );
}
