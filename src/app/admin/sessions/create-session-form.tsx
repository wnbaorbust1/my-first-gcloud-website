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
import { Textarea } from "@/components/ui/textarea";

interface FacilitatorOption {
  id: string;
  name: string;
}

const SESSION_TYPES = [
  { value: "PASSION", label: "Passion" },
  { value: "POWER", label: "Power" },
  { value: "LEGACY", label: "Legacy" },
  { value: "GROWTH", label: "Growth" },
];

export function CreateSessionForm({ facilitators }: { facilitators: FacilitatorOption[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [sessionType, setSessionType] = useState("PASSION");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState<"VIRTUAL" | "IN_PERSON">("VIRTUAL");
  const [startsAt, setStartsAt] = useState("");
  const [capacity, setCapacity] = useState("");
  const [facilitatorId, setFacilitatorId] = useState<string>("none");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await fetch("/api/admin/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        sessionType,
        description,
        format,
        startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
        capacity: capacity ? Number(capacity) : undefined,
        facilitatorId: facilitatorId === "none" ? undefined : facilitatorId,
      }),
    });

    setIsSubmitting(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong.");
      return;
    }

    setTitle("");
    setDescription("");
    setStartsAt("");
    setCapacity("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <Alert variant="danger">{error}</Alert>}

      <div>
        <Label htmlFor="session-title">Title</Label>
        <Input id="session-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Session Type</Label>
          <Select value={sessionType} onValueChange={setSessionType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SESSION_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Format</Label>
          <Select value={format} onValueChange={(v) => setFormat(v as typeof format)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="VIRTUAL">Virtual</SelectItem>
              <SelectItem value="IN_PERSON">In Person</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="session-description">Description</Label>
        <Textarea
          id="session-description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="session-starts">Starts At</Label>
          <Input
            id="session-starts"
            type="datetime-local"
            required
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="session-capacity">Capacity</Label>
          <Input
            id="session-capacity"
            type="number"
            min="1"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </div>
        <div>
          <Label>Facilitator</Label>
          <Select value={facilitatorId} onValueChange={setFacilitatorId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {facilitators.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting ? "Creating…" : "Create Session"}
      </Button>
    </form>
  );
}
