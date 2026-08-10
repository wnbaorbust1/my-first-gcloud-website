"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/** spec Prompt 8 EXISTING MEMBER RULE: "Admin may manually grant promotional credit later." */
export function MembershipGrantForm({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"SPONSORED" | "ADMIN_GRANTED">("SPONSORED");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/admin/membership/${businessId}/grant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reason }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong.");
      return;
    }
    setMessage("Membership granted.");
    setReason("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="min-w-[160px]">
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SPONSORED">Sponsored</SelectItem>
            <SelectItem value="ADMIN_GRANTED">Admin Granted</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (required — e.g. scholarship, promo, goodwill)"
        rows={1}
        className="min-w-[240px] flex-1"
        required
      />
      <Button type="submit" size="sm" disabled={busy}>
        {busy ? "Granting…" : "Grant"}
      </Button>
      {error && (
        <Alert variant="danger" className="w-full">
          {error}
        </Alert>
      )}
      {message && (
        <Alert variant="success" className="w-full">
          {message}
        </Alert>
      )}
    </form>
  );
}
