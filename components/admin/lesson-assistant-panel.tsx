"use client";

import { useState } from "react";
import type { AssistantEdit, AssistantTargetField, LessonSnapshot } from "@/lib/ai/schemas";
import { cn } from "@/lib/utils";

const FIELD_LABELS: Record<AssistantTargetField, string> = {
  title: "Title",
  i_do: "I Do",
  we_do: "We Do",
  you_do_together: "You Do Together",
  you_do: "You Do",
  qsssa_question: "QSSSA — Question",
  qsssa_signal: "QSSSA — Signal",
  qsssa_stem: "QSSSA — Stem",
  qsssa_share: "QSSSA — Share",
  qsssa_assess: "QSSSA — Assess",
  segment_bell_ringer: "Bell Ringer",
  segment_mini_lesson: "Mini Lesson",
  segment_modeling: "Modeling",
  segment_activity: "Activity",
  segment_debrief: "Debrief",
  segment_exit_ticket: "Exit Ticket",
  homework: "Homework",
};

type AssistantMessage = {
  id: string;
  instruction: string;
  status: "pending" | "done" | "error";
  edit?: AssistantEdit;
  error?: string;
  applied?: boolean;
};

/**
 * Chat-style panel: each turn is stateless on the server (it gets the full
 * current lesson snapshot, not a running conversation), but the UI keeps a
 * running history so the admin can see what they asked for and whether it
 * was applied. Edits never write into the form silently — the admin
 * reviews the explanation and clicks Apply.
 */
export function LessonAssistantPanel({
  getSnapshot,
  onApply,
}: {
  getSnapshot: () => LessonSnapshot;
  onApply: (edit: AssistantEdit) => void;
}) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");

  async function sendInstruction() {
    const instruction = input.trim();
    if (!instruction) return;

    const id = crypto.randomUUID();
    setMessages((prev) => [...prev, { id, instruction, status: "pending" }]);
    setInput("");

    try {
      const res = await fetch("/api/ai/lesson-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson: getSnapshot(), instruction }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === id ? { ...m, status: "error", error: data.error ?? "Request failed." } : m,
          ),
        );
        return;
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: "done", edit: data.edit } : m)),
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, status: "error", error: "Request failed unexpectedly." } : m,
        ),
      );
    }
  }

  function handleApply(message: AssistantMessage) {
    if (!message.edit) return;
    onApply(message.edit);
    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, applied: true } : m)));
  }

  return (
    <div className="flex h-full flex-col border border-rose-gold/40 bg-cream">
      <div className="border-b border-rose-gold/40 px-4 py-3">
        <p className="font-display text-lg font-semibold text-ink">AI Lesson Assistant</p>
        <p className="mt-0.5 text-xs text-slate">
          Ask it to change one part of the lesson — it edits just that field.
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="text-xs text-slate">
            Try “make the activity more hands-on” or “add a real-world example to We Do.”
          </p>
        )}

        {messages.map((message) => (
          <div key={message.id} className="space-y-2">
            <p className="ledger-row pb-2 text-sm text-ink">{message.instruction}</p>

            {message.status === "pending" && (
              <p className="text-xs text-slate">Thinking…</p>
            )}

            {message.status === "error" && (
              <p role="alert" className="text-xs text-rose-gold">
                {message.error}
              </p>
            )}

            {message.status === "done" && message.edit && (
              <div className="border border-rose-gold/30 bg-white/40 p-3">
                <p className="font-mono text-[11px] uppercase tracking-wide text-rose-gold">
                  {FIELD_LABELS[message.edit.target_field]}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-ink">
                  {message.edit.explanation}
                </p>
                <button
                  type="button"
                  onClick={() => handleApply(message)}
                  disabled={message.applied}
                  className={cn(
                    "mt-2 border px-3 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors",
                    message.applied
                      ? "border-slate/30 text-slate"
                      : "border-ink text-ink hover:bg-ink hover:text-cream",
                  )}
                >
                  {message.applied ? "Applied" : "Apply to lesson"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendInstruction();
        }}
        className="border-t border-rose-gold/40 p-3"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void sendInstruction();
            }
          }}
          rows={2}
          placeholder="Ask for a change…"
          className="w-full border border-slate/40 bg-cream px-3 py-2 text-sm text-ink placeholder:text-slate/60"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="mt-2 w-full bg-ink px-4 py-2 text-sm font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}
