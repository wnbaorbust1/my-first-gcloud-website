"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addPortfolioItemAction } from "@/lib/portfolio/actions";
import type { PortfolioArtifactType } from "@/types/supabase";

type AssignmentOption = { id: string; title: string };

const ARTIFACT_TYPE_LABELS: Record<PortfolioArtifactType, string> = {
  file: "File upload",
  link: "Link",
  text: "Text",
};

/** Add-item form for one student's portfolio — file/link/text, all sharing the same title/description/notes fields. */
export function AddPortfolioItemForm({
  studentId,
  classId,
  assignmentOptions,
  revalidatePaths,
}: {
  studentId: string;
  classId: string;
  assignmentOptions: AssignmentOption[];
  revalidatePaths: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [artifactType, setArtifactType] = useState<PortfolioArtifactType>("text");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [textContent, setTextContent] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [submittedDate, setSubmittedDate] = useState("");
  const [teacherNotes, setTeacherNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTitle("");
    setDescription("");
    setLinkUrl("");
    setTextContent("");
    setAssignmentId("");
    setSubmittedDate("");
    setTeacherNotes("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setError(null);

    const base = {
      studentId,
      classId,
      title,
      description: description || undefined,
      assignmentId: assignmentId || undefined,
      submittedDate: submittedDate || undefined,
      teacherNotes: teacherNotes || undefined,
      revalidatePaths,
    };

    startTransition(async () => {
      const result = await (artifactType === "file"
        ? (() => {
            const file = fileInputRef.current?.files?.[0];
            if (!file) {
              setError("Choose a file to upload.");
              return { success: false as const, error: "Choose a file to upload." };
            }
            return addPortfolioItemAction({ ...base, artifactType: "file", file });
          })()
        : artifactType === "link"
          ? addPortfolioItemAction({ ...base, artifactType: "link", linkUrl })
          : addPortfolioItemAction({ ...base, artifactType: "text", textContent }));

      if (!result.success) {
        setError(result.error);
        return;
      }
      reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 border border-rose-gold/40 bg-cream p-4">
      <div className="flex flex-wrap gap-4">
        <div className="min-w-[10rem] flex-1 space-y-1.5">
          <label htmlFor="pf-title" className="block text-sm font-medium text-ink">
            Title
          </label>
          <input
            id="pf-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Linear Systems Project"
            className="w-full border border-slate/40 bg-cream px-3 py-2 text-sm text-ink placeholder:text-slate/60"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="pf-type" className="block text-sm font-medium text-ink">
            Type
          </label>
          <select
            id="pf-type"
            value={artifactType}
            onChange={(e) => setArtifactType(e.target.value as PortfolioArtifactType)}
            className="border border-slate/40 bg-cream px-3 py-2 text-sm text-ink"
          >
            {(Object.keys(ARTIFACT_TYPE_LABELS) as PortfolioArtifactType[]).map((type) => (
              <option key={type} value={type}>
                {ARTIFACT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="pf-date" className="block text-sm font-medium text-ink">
            Date
          </label>
          <input
            id="pf-date"
            type="date"
            value={submittedDate}
            onChange={(e) => setSubmittedDate(e.target.value)}
            className="border border-slate/40 bg-cream px-3 py-2 text-sm text-ink"
          />
        </div>
      </div>

      {artifactType === "file" && (
        <div className="space-y-1.5">
          <label htmlFor="pf-file" className="block text-sm font-medium text-ink">
            File
          </label>
          <input
            id="pf-file"
            ref={fileInputRef}
            type="file"
            className="w-full border border-slate/40 bg-cream px-3 py-2 text-sm text-ink"
          />
        </div>
      )}

      {artifactType === "link" && (
        <div className="space-y-1.5">
          <label htmlFor="pf-link" className="block text-sm font-medium text-ink">
            Link
          </label>
          <input
            id="pf-link"
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://…"
            className="w-full border border-slate/40 bg-cream px-3 py-2 text-sm text-ink placeholder:text-slate/60"
          />
        </div>
      )}

      {artifactType === "text" && (
        <div className="space-y-1.5">
          <label htmlFor="pf-text" className="block text-sm font-medium text-ink">
            Text
          </label>
          <textarea
            id="pf-text"
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            rows={4}
            className="w-full border border-slate/40 bg-cream px-3 py-2 text-sm text-ink"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="pf-description" className="block text-sm font-medium text-ink">
          Description <span className="text-slate">(optional)</span>
        </label>
        <input
          id="pf-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border border-slate/40 bg-cream px-3 py-2 text-sm text-ink"
        />
      </div>

      {assignmentOptions.length > 0 && (
        <div className="space-y-1.5">
          <label htmlFor="pf-assignment" className="block text-sm font-medium text-ink">
            From assignment <span className="text-slate">(optional)</span>
          </label>
          <select
            id="pf-assignment"
            value={assignmentId}
            onChange={(e) => setAssignmentId(e.target.value)}
            className="w-full border border-slate/40 bg-cream px-3 py-2 text-sm text-ink"
          >
            <option value="">— None —</option>
            {assignmentOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="pf-notes" className="block text-sm font-medium text-ink">
          Teacher notes <span className="text-slate">(optional)</span>
        </label>
        <input
          id="pf-notes"
          value={teacherNotes}
          onChange={(e) => setTeacherNotes(e.target.value)}
          className="w-full border border-slate/40 bg-cream px-3 py-2 text-sm text-ink"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-rose-gold">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !title.trim()}
        className="bg-ink px-4 py-2 text-sm font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Saving…" : "+ Add to portfolio"}
      </button>
    </form>
  );
}
