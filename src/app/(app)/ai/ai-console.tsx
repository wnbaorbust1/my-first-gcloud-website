"use client";

import { Check, Pencil, Plus, Sparkles, Star } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AI_MODES } from "@/lib/ai/modes";
import { cn } from "@/lib/utils";

type AiModeKey = (typeof AI_MODES)[number]["mode"];

interface ConversationSummary {
  id: string;
  title: string;
  topic: string;
  mode: AiModeKey;
  updatedAt: string;
  relatedTask: { id: string; title: string } | null;
  lastMessagePreview: string | null;
}

interface Message {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  mode: AiModeKey | null;
  actionType: string | null;
  isFavorite: boolean;
  createdAt: string;
}

function relativeDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function AiConsole({
  businessId,
  businessName,
  initialConversations,
}: {
  businessId: string;
  businessName: string;
  initialConversations: ConversationSummary[];
}) {
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get("conversation") ?? initialConversations[0]?.id ?? null,
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [mode, setMode] = useState<AiModeKey>("BUSINESS_COACH");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    let cancelled = false;

    async function loadThread() {
      setLoadingThread(true);
      try {
        const res = await fetch(`/api/ai/conversations/${selectedId}`);
        if (!res.ok) throw new Error();
        const data = (await res.json()) as {
          conversation: { messages: Message[]; mode: AiModeKey };
        };
        if (cancelled) return;
        setMessages(data.conversation.messages);
        setMode(data.conversation.mode);
      } catch {
        if (!cancelled) setError("Couldn't load that conversation.");
      } finally {
        if (!cancelled) setLoadingThread(false);
      }
    }

    loadThread();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  function startNew() {
    setSelectedId(null);
    setMessages([]);
    setMode("BUSINESS_COACH");
    setError(null);
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    const outgoing = text.trim();
    setText("");

    try {
      if (!selectedId) {
        const res = await fetch("/api/ai/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessId, message: outgoing, mode }),
        });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { conversation: { id: string; title: string; topic: string; updatedAt: string; messages: Message[] } };
        setSelectedId(data.conversation.id);
        setMessages(data.conversation.messages);
        setConversations((prev) => [
          {
            id: data.conversation.id,
            title: data.conversation.title,
            topic: data.conversation.topic,
            mode,
            updatedAt: data.conversation.updatedAt,
            relatedTask: null,
            lastMessagePreview: data.conversation.messages.at(-1)?.content.slice(0, 80) ?? null,
          },
          ...prev,
        ]);
      } else {
        const res = await fetch(`/api/ai/conversations/${selectedId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: outgoing, mode }),
        });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { userMessage: Message; assistantMessage: Message };
        setMessages((prev) => [...prev, data.userMessage, data.assistantMessage]);
        setConversations((prev) => {
          const updated = prev.map((c) =>
            c.id === selectedId
              ? { ...c, updatedAt: new Date().toISOString(), lastMessagePreview: data.assistantMessage.content.slice(0, 80) }
              : c,
          );
          const moved = updated.find((c) => c.id === selectedId);
          return moved ? [moved, ...updated.filter((c) => c.id !== selectedId)] : updated;
        });
      }
    } catch {
      setError("Something went wrong sending that. Your draft wasn't lost — try again.");
      setText(outgoing);
    } finally {
      setBusy(false);
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

  async function saveRename(id: string) {
    const title = renameValue.trim();
    setRenamingId(null);
    if (!title) return;
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
    await fetch(`/api/ai/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
  }

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[32rem] gap-6">
      <aside className="flex w-72 shrink-0 flex-col rounded-2xl border border-navy-100 bg-surface">
        <div className="flex items-center justify-between border-b border-navy-100 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
              Blueprint AI
            </p>
            <p className="text-sm text-foreground-muted">{businessName}</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={startNew}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            New
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 && (
            <p className="p-3 text-sm text-foreground-muted">
              No conversations yet — ask Blueprint AI anything below.
            </p>
          )}
          {conversations.map((c) => (
            <div
              key={c.id}
              className={cn(
                "group mb-1 rounded-xl px-3 py-2 text-sm",
                c.id === selectedId ? "bg-navy-800 text-cream-50" : "hover:bg-navy-50",
              )}
            >
              {renamingId === c.id ? (
                <div className="flex items-center gap-1">
                  <Input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveRename(c.id)}
                    className="h-8 text-xs"
                  />
                  <button type="button" onClick={() => saveRename(c.id)} aria-label="Save name">
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className="block w-full text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{c.title}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenamingId(c.id);
                        setRenameValue(c.title);
                      }}
                      className={cn(
                        "shrink-0 opacity-0 group-hover:opacity-100",
                        c.id === selectedId && "text-cream-100",
                      )}
                      aria-label="Rename conversation"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  </div>
                  <p
                    className={cn(
                      "mt-0.5 truncate text-xs",
                      c.id === selectedId ? "text-cream-200" : "text-foreground-muted",
                    )}
                  >
                    {c.topic}
                    {c.relatedTask ? ` · ${c.relatedTask.title}` : ""} · {relativeDate(c.updatedAt)}
                  </p>
                </button>
              )}
            </div>
          ))}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col rounded-2xl border border-navy-100 bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-100 p-4">
          <div className="min-w-0">
            <p className="truncate font-semibold text-navy-900">{selected?.title ?? "New Conversation"}</p>
            <p className="text-xs text-foreground-muted">
              Not a substitute for a licensed attorney, CPA, financial adviser, or medical professional.
            </p>
          </div>
          <Select value={mode} onValueChange={(v) => setMode(v as AiModeKey)}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AI_MODES.map((m) => (
                <SelectItem key={m.mode} value={m.mode}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loadingThread && <p className="text-sm text-foreground-muted">Loading…</p>}
          {!loadingThread && messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center text-foreground-muted">
              <Sparkles className="mb-3 h-8 w-8 text-gold-500" aria-hidden="true" />
              <p className="max-w-sm text-sm">
                Ask Blueprint AI about your business — it already knows your assessment scores,
                roadmap, and Blueprint sections.
              </p>
            </div>
          )}
          <div className="flex flex-col gap-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn("flex", m.role === "USER" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line",
                    m.role === "USER" ? "bg-navy-800 text-cream-50" : "bg-navy-50 text-navy-900",
                  )}
                >
                  {m.content}
                  {m.role === "ASSISTANT" && (
                    <div className="mt-2 flex items-center gap-1 border-t border-navy-100 pt-2">
                      <button
                        type="button"
                        onClick={() => toggleFavorite(m)}
                        className="inline-flex items-center gap-1 text-xs text-navy-400 hover:text-gold-600"
                      >
                        <Star
                          className={cn("h-3.5 w-3.5", m.isFavorite && "fill-gold-500 text-gold-500")}
                          aria-hidden="true"
                        />
                        {m.isFavorite ? "Favorited" : "Favorite"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="px-4">
            <Alert variant="danger">{error}</Alert>
          </div>
        )}

        <form onSubmit={handleSend} className="flex items-end gap-3 border-t border-navy-100 p-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask Blueprint AI anything about your business…"
            rows={2}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
          />
          <Button type="submit" disabled={busy || !text.trim()}>
            {busy ? "Sending…" : "Send"}
          </Button>
        </form>
      </section>
    </div>
  );
}
