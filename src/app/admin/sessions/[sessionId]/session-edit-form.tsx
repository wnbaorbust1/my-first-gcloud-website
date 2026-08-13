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

interface Option {
  id: string;
  name: string;
}

interface SessionEditFormProps {
  session: {
    id: string;
    title: string;
    sessionType: string;
    description: string | null;
    status: string;
    format: string;
    startsAt: string; // ISO
    endsAt: string | null; // ISO
    location: string | null;
    virtualLink: string | null;
    priceCents: number | null;
    capacity: number | null;
    facilitatorId: string | null;
    programId: string | null;
    organizationId: string | null;
  };
  facilitators: Option[];
  organizations: Option[];
  programs: Option[];
}

const SESSION_TYPES = ["PASSION", "POWER", "LEGACY", "GROWTH"];
const STATUSES = ["DRAFT", "SCHEDULED", "CANCELLED", "COMPLETED"];

/** "Change sessions" (Phase 7 continued) — full-field editing, PATCHes /api/admin/sessions/[id]. */
export function SessionEditForm({ session, facilitators, organizations, programs }: SessionEditFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(session.title);
  const [sessionType, setSessionType] = useState(session.sessionType);
  const [description, setDescription] = useState(session.description ?? "");
  const [status, setStatus] = useState(session.status);
  const [format, setFormat] = useState(session.format);
  const [startsAt, setStartsAt] = useState(toLocalInputValue(session.startsAt));
  const [endsAt, setEndsAt] = useState(session.endsAt ? toLocalInputValue(session.endsAt) : "");
  const [location, setLocation] = useState(session.location ?? "");
  const [virtualLink, setVirtualLink] = useState(session.virtualLink ?? "");
  const [priceDollars, setPriceDollars] = useState(
    session.priceCents !== null ? String(session.priceCents / 100) : "",
  );
  const [capacity, setCapacity] = useState(session.capacity !== null ? String(session.capacity) : "");
  const [facilitatorId, setFacilitatorId] = useState(session.facilitatorId ?? "none");
  const [programId, setProgramId] = useState(session.programId ?? "none");
  const [organizationId, setOrganizationId] = useState(session.organizationId ?? "none");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);

    const res = await fetch(`/api/admin/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        sessionType,
        description: description.trim() === "" ? null : description,
        status,
        format,
        startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        location: location.trim() === "" ? null : location,
        virtualLink: virtualLink.trim() === "" ? null : virtualLink,
        priceCents: priceDollars.trim() === "" ? null : Math.round(Number(priceDollars) * 100),
        capacity: capacity.trim() === "" ? null : Number(capacity),
        facilitatorId: facilitatorId === "none" ? null : facilitatorId,
        programId: programId === "none" ? null : programId,
        organizationId: organizationId === "none" ? null : organizationId,
      }),
    });

    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong.");
      return;
    }
    setMessage("Session updated.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <Alert variant="danger">{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}

      <div>
        <Label htmlFor="edit-title">Title</Label>
        <Input id="edit-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div>
        <Label htmlFor="edit-description">Description</Label>
        <Textarea id="edit-description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label>Session Type</Label>
          <Select value={sessionType} onValueChange={setSessionType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SESSION_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Format</Label>
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="VIRTUAL">Virtual</SelectItem>
              <SelectItem value="IN_PERSON">In Person</SelectItem>
            </SelectContent>
          </Select>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label htmlFor="edit-starts">Starts At</Label>
          <Input id="edit-starts" type="datetime-local" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="edit-ends">Ends At</Label>
          <Input id="edit-ends" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="edit-capacity">Capacity</Label>
          <Input id="edit-capacity" type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="edit-price">Price (USD)</Label>
          <Input
            id="edit-price"
            type="number"
            min="0"
            step="0.01"
            value={priceDollars}
            onChange={(e) => setPriceDollars(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="edit-location">Location (in-person)</Label>
          <Input id="edit-location" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="edit-virtual-link">Virtual Link</Label>
          <Input id="edit-virtual-link" value={virtualLink} onChange={(e) => setVirtualLink(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Program</Label>
          <Select value={programId} onValueChange={setProgramId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {programs.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Organization</Label>
          <Select value={organizationId} onValueChange={setOrganizationId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (platform session)</SelectItem>
              {organizations.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" disabled={busy} className="self-start">
        {busy ? "Saving…" : "Save Changes"}
      </Button>
    </form>
  );
}

/** `<input type="datetime-local">` wants "YYYY-MM-DDTHH:mm" in local time, not a raw ISO string. */
function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
