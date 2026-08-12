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

interface FacilitatorOption {
  id: string;
  name: string;
}

interface Assignment {
  id: string;
  facilitator: { firstName: string; lastName: string; email: string };
  business: { name: string };
}

export function FacilitatorAssignmentForm({
  facilitators,
  assignments,
}: {
  facilitators: FacilitatorOption[];
  assignments: Assignment[];
}) {
  const router = useRouter();
  const [facilitatorId, setFacilitatorId] = useState(facilitators[0]?.id ?? "");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await fetch("/api/admin/facilitator-assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facilitatorId, ownerEmail }),
    });

    setIsSubmitting(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong.");
      return;
    }

    setOwnerEmail("");
    router.refresh();
  }

  async function handleRemove(assignmentId: string) {
    await fetch("/api/admin/facilitator-assignments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignmentId }),
    });
    router.refresh();
  }

  if (facilitators.length === 0) {
    return (
      <p className="text-sm text-foreground-muted">
        No facilitator/admin accounts yet — promote a user&apos;s role on{" "}
        <a href="/admin/users" className="underline">
          Users
        </a>{" "}
        first.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {assignments.length > 0 && (
        <ul className="flex flex-col gap-2 text-sm">
          {assignments.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-navy-100 px-3 py-2"
            >
              <span>
                <span className="font-medium text-navy-900">
                  {a.facilitator.firstName} {a.facilitator.lastName}
                </span>{" "}
                <span className="text-foreground-muted">→ {a.business.name}</span>
              </span>
              <button
                type="button"
                onClick={() => handleRemove(a.id)}
                className="text-xs font-medium text-danger hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <Alert variant="danger">{error}</Alert>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Facilitator</Label>
            <Select value={facilitatorId} onValueChange={setFacilitatorId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {facilitators.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="owner-email">Business Owner&apos;s Email</Label>
            <Input
              id="owner-email"
              type="email"
              required
              placeholder="owner@example.com"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
            />
          </div>
        </div>
        <Button type="submit" size="sm" disabled={isSubmitting} className="self-start">
          {isSubmitting ? "Assigning…" : "Assign Facilitator"}
        </Button>
      </form>
    </div>
  );
}
