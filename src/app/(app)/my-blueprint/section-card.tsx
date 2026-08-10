"use client";

import { CheckCircle2, Pencil, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  businessId: string;
  title: string;
  content: string | null;
  lastEditedAt: string | null;
  updatedAt: string | null;
  sourceTask: { id: string; title: string } | null;
  builderTask: { id: string; title: string; status: string } | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SectionCard({
  businessId,
  title,
  content,
  lastEditedAt,
  updatedAt,
  sourceTask,
  builderTask,
}: SectionCardProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/blueprint/sections", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, title, content: draft }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong saving this section.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  const hasContent = Boolean(content?.trim());

  return (
    <Card className={cn(!hasContent && !editing && "border-dashed bg-surface-muted")}>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setDraft(content ?? "");
              setEditing(true);
            }}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-navy-100 px-2.5 py-1 text-xs font-medium text-navy-500 hover:border-navy-300 hover:text-navy-800"
          >
            <Pencil className="h-3 w-3" aria-hidden="true" />
            {hasContent ? "Edit" : "Add"}
          </button>
        )}
      </CardHeader>

      {editing ? (
        <div className="flex flex-col gap-3">
          <Textarea
            rows={5}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Write ${title.toLowerCase()} for your business…`}
          />
          {error && <Alert variant="danger">{error}</Alert>}
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" onClick={handleSave} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
              disabled={busy}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : hasContent ? (
        <>
          <p className="whitespace-pre-line text-sm text-foreground-muted">{content}</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-navy-100 pt-3 text-xs text-navy-400">
            {sourceTask && (
              <span className="inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                From{" "}
                <Link href={`/build/${sourceTask.id}`} className="underline hover:text-navy-700">
                  {sourceTask.title}
                </Link>
              </span>
            )}
            {lastEditedAt && <span>Edited {formatDate(lastEditedAt)}</span>}
            {!lastEditedAt && updatedAt && <span>Saved {formatDate(updatedAt)}</span>}
          </div>
        </>
      ) : (
        <div>
          <p className="text-sm text-foreground-muted">
            {builderTask
              ? "Not started yet — build this in your roadmap, or add it yourself."
              : "Nothing here yet — add it yourself whenever you're ready."}
          </p>
          {builderTask && (
            <Link
              href={`/build/${builderTask.id}`}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-navy-500 underline hover:text-navy-800"
            >
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              Build “{builderTask.title}”
            </Link>
          )}
        </div>
      )}
    </Card>
  );
}
