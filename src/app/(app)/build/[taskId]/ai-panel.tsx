"use client";

import { ChevronDown, ChevronUp, ExternalLink, Sparkles, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AI_ACTIONS, type BuilderTaskPromptContext } from "@/lib/ai/actions";
import { AI_MODE_BY_KEY } from "@/lib/ai/modes";
import type { InstructionField } from "@/lib/roadmap/task-templates";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  isFavorite: boolean;
}

/**
 * AI ACTIONS (spec Prompt 7): the 9 buttons "throughout Builder." Every
 * Business Builder task page gets one of these panels — clicking any
 * button starts (or continues) one AI conversation scoped to this task
 * (`relatedTaskId`), built from the task's real context plus the
 * member's *current, unsaved* draft answers, so "Improve This"/"Check My
 * Work" reflect what's actually in the form right now, not just what's
 * been saved.
 */
export function AiPanel({
  businessId,
  taskId,
  title,
  category,
  whyItMatters,
  instructions,
  answers,
}: {
  businessId: string;
  taskId: string;
  title: string;
  category: string;
  whyItMatters: string;
  instructions: InstructionField[];
  answers: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState("");
  const [error, setError] = useState<string | null>(null);

  function buildContext(): BuilderTaskPromptContext {
    return {
      title,
      category,
      whyItMatters,
      steps: instructions.map((i) => ({ label: i.label, prompt: i.prompt, answer: answers[i.key] ?? "" })),
    };
  }

  async function send(prompt: string, mode: string, actionType?: string) {
    setBusy(actionType ?? "follow-up");
    setError(null);
    setOpen(true);
    try {
      if (!conversationId) {
        const res = await fetch("/api/ai/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessId,
            message: prompt,
            mode,
            topic: category,
            relatedTaskId: taskId,
            actionType,
          }),
        });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { conversation: { id: string; messages: Message[] } };
        setConversationId(data.conversation.id);
        setMessages(data.conversation.messages);
      } else {
        const res = await fetch(`/api/ai/conversations/${conversationId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: prompt, mode, actionType }),
        });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { userMessage: Message; assistantMessage: Message };
        setMessages((prev) => [...prev, data.userMessage, data.assistantMessage]);
      }
    } catch {
      setError("Blueprint AI didn't respond — try again.");
    } finally {
      setBusy(null);
    }
  }

  async function toggleFavorite(message: Message) {
    const next = !message.isFavorite;
    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, isFavorite: next } : m)));
    await fetch(`/api/ai/messages/${message.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: next }),
    });
  }

  return (
    <div className="mt-6 rounded-2xl border border-navy-100 bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 p-4 text-left"
      >
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-navy-900">
          <Sparkles className="h-4 w-4 text-gold-500" aria-hidden="true" />
          Ask Blueprint AI about this task
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-navy-400" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4 text-navy-400" aria-hidden="true" />
        )}
      </button>

      {open && (
        <div className="border-t border-navy-100 p-4">
          <p className="mb-3 text-xs text-foreground-muted">
            Not a substitute for a licensed attorney, CPA, financial adviser, or medical
            professional.
          </p>

          <div className="flex flex-wrap gap-2">
            {AI_ACTIONS.map((action) => (
              <button
                key={action.key}
                type="button"
                disabled={busy !== null}
                onClick={() => send(action.buildPrompt(buildContext()), action.defaultMode, action.key)}
                className={cn(
                  "rounded-full border border-navy-200 px-3 py-1.5 text-xs font-medium text-navy-700",
                  "hover:border-navy-400 hover:bg-navy-50 disabled:opacity-50",
                )}
              >
                {busy === action.key ? "Thinking…" : action.label}
              </button>
            ))}
          </div>

          {error && (
            <Alert variant="danger" className="mt-3">
              {error}
            </Alert>
          )}

          {messages.length > 0 && (
            <div className="mt-4 flex flex-col gap-3 border-t border-navy-100 pt-4">
              {messages.map((m) => (
                <div key={m.id} className={cn("flex", m.role === "USER" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[90%] rounded-xl px-3.5 py-2 text-sm whitespace-pre-line",
                      m.role === "USER" ? "bg-navy-800 text-cream-50" : "bg-navy-50 text-navy-900",
                    )}
                  >
                    {m.content}
                    {m.role === "ASSISTANT" && (
                      <div className="mt-1.5 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleFavorite(m)}
                          className="inline-flex items-center gap-1 text-xs text-navy-400 hover:text-gold-600"
                        >
                          <Star
                            className={cn("h-3 w-3", m.isFavorite && "fill-gold-500 text-gold-500")}
                            aria-hidden="true"
                          />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!followUp.trim()) return;
                  const defaultMode = AI_MODE_BY_KEY.BUSINESS_COACH.mode;
                  send(followUp.trim(), defaultMode);
                  setFollowUp("");
                }}
                className="flex items-end gap-2"
              >
                <Textarea
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                  placeholder="Ask a follow-up…"
                  rows={2}
                  className="flex-1"
                />
                <Button type="submit" size="sm" disabled={busy !== null || !followUp.trim()}>
                  Send
                </Button>
              </form>

              {conversationId && (
                <Link
                  href={`/ai?conversation=${conversationId}`}
                  className="inline-flex items-center gap-1 self-start text-xs font-medium text-navy-500 underline hover:text-navy-800"
                >
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  Continue in Blueprint AI
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
