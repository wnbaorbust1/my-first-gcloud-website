"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";
import { Label } from "@/components/ui/label";

export function ProgramForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await fetch("/api/admin/programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });

    setIsSubmitting(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong.");
      return;
    }
    setName("");
    setDescription("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      {error && (
        <Alert variant="danger" className="w-full">
          {error}
        </Alert>
      )}
      <div className="min-w-[180px]">
        <Label htmlFor="program-name">Name</Label>
        <Input
          id="program-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Veteran Entrepreneur Track"
        />
      </div>
      <div className="min-w-[220px] flex-1">
        <Label htmlFor="program-description">Description</Label>
        <Input id="program-description" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <Button type="submit" size="sm" disabled={isSubmitting}>
        {isSubmitting ? "Adding…" : "Add Program"}
      </Button>
    </form>
  );
}
