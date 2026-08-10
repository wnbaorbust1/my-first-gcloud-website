"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const NOTE_TYPES = [
  { value: "PRIVATE", label: "Private Note" },
  { value: "PARTICIPANT_VISIBLE", label: "Participant-Visible Note" },
  { value: "RECOMMENDATION", label: "Recommendation" },
  { value: "TASK_RECOMMENDATION", label: "Task Recommendation" },
];

export function NoteForm({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [noteType, setNoteType] = useState("PRIVATE");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setIsSaving(true);
    await fetch("/api/facilitator/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, noteType, note }),
    });
    setIsSaving(false);
    setNote("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Select value={noteType} onValueChange={setNoteType}>
          <SelectTrigger className="h-9 w-56 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NOTE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note…"
        rows={2}
      />
      <Button type="submit" size="sm" variant="outline" disabled={isSaving} className="self-start">
        {isSaving ? "Saving…" : "Add Note"}
      </Button>
    </form>
  );
}
