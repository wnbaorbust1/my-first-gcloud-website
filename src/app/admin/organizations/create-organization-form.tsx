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
import { ORGANIZATION_TYPE_LABELS, ORGANIZATION_TYPE_ORDER } from "@/lib/organizations/meta";

export function CreateOrganizationForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("NONPROFIT");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await fetch("/api/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type }),
    });

    setIsSubmitting(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong.");
      return;
    }
    setName("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      {error && (
        <Alert variant="danger" className="w-full">
          {error}
        </Alert>
      )}
      <div className="min-w-[220px] flex-1">
        <Label htmlFor="org-name">Name</Label>
        <Input
          id="org-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Queens Chamber of Commerce"
        />
      </div>
      <div className="min-w-[220px]">
        <Label>Type</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ORGANIZATION_TYPE_ORDER.map((t) => (
              <SelectItem key={t} value={t}>
                {ORGANIZATION_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating…" : "Create Organization"}
      </Button>
    </form>
  );
}
