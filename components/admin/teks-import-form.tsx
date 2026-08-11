"use client";

import { useState, useTransition } from "react";
import { commitTeksImportAction } from "@/lib/admin/teks-actions";
import type { TeksImportRow } from "@/lib/ai/schemas";

/**
 * TEKS import: paste raw standards text for a subject, let Claude parse
 * it into structured rows, then review/edit every row before committing.
 * Nothing reaches the `teks` table until the admin explicitly imports —
 * same "AI proposes, human approves" posture as everything else here.
 */
export function TeksImportForm({ subjects }: { subjects: string[] }) {
  const [subject, setSubject] = useState(subjects[0] ?? "");
  const [rawText, setRawText] = useState("");
  const [rows, setRows] = useState<TeksImportRow[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const [pending, startTransition] = useTransition();
  const [commitError, setCommitError] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState<string | null>(null);

  async function handleParse() {
    if (!subject || !rawText.trim()) return;
    setParsing(true);
    setParseError(null);
    setCommitMessage(null);
    try {
      const res = await fetch("/api/ai/import-teks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, rawText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setParseError(data.error ?? "Parsing failed.");
        return;
      }
      setRows(data.rows);
    } catch {
      setParseError("Parsing failed unexpectedly. Try again.");
    } finally {
      setParsing(false);
    }
  }

  function updateRow(index: number, patch: Partial<TeksImportRow>) {
    setRows((prev) => prev?.map((r, i) => (i === index ? { ...r, ...patch } : r)) ?? null);
  }

  function removeRow(index: number) {
    setRows((prev) => prev?.filter((_, i) => i !== index) ?? null);
  }

  function handleCommit() {
    if (!rows || rows.length === 0) return;
    setCommitError(null);
    setCommitMessage(null);
    startTransition(async () => {
      const result = await commitTeksImportAction({ subject, rows });
      if (!result.success) {
        setCommitError(result.error);
        return;
      }
      setCommitMessage(`Imported ${result.count} standard${result.count === 1 ? "" : "s"} for ${subject}.`);
      setRows(null);
      setRawText("");
    });
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="teks-subject" className="block text-sm font-medium text-ink">
            Subject
          </label>
          <select
            id="teks-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full border border-slate/40 bg-cream px-3 py-2 text-sm text-ink"
          >
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="teks-raw-text" className="block text-sm font-medium text-ink">
          Paste TEKS text
        </label>
        <textarea
          id="teks-raw-text"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={12}
          placeholder="Paste the official TEA TEKS listing for this subject — formatting doesn't need to be clean, the AI parses code + description pairs out of it."
          className="w-full border border-slate/40 bg-cream px-3 py-2 font-mono text-xs text-ink placeholder:text-slate/60"
        />
      </div>

      {parseError && (
        <p role="alert" className="text-sm text-rose-gold">
          {parseError}
        </p>
      )}

      <button
        type="button"
        onClick={handleParse}
        disabled={parsing || !subject || !rawText.trim()}
        className="border border-ink px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-cream disabled:opacity-60"
      >
        {parsing ? "Parsing… this can take a minute" : "Parse with AI"}
      </button>

      {rows && (
        <div className="border-t border-rose-gold/40 pt-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-semibold text-ink">
              Review before importing
            </h2>
            <span className="font-mono text-xs text-slate">{rows.length} rows</span>
          </div>
          <p className="mt-1 text-sm text-slate">
            Edit or remove any row before committing — nothing is saved until you click Import.
          </p>

          <div className="mt-4 max-h-[32rem] space-y-3 overflow-y-auto">
            {rows.map((row, index) => (
              <div key={index} className="flex items-start gap-2 border-b border-rose-gold/20 pb-3">
                <input
                  value={row.code}
                  onChange={(e) => updateRow(index, { code: e.target.value })}
                  className="w-48 shrink-0 border border-slate/40 bg-cream px-2 py-1.5 font-mono text-xs text-ink"
                />
                <textarea
                  value={row.description}
                  onChange={(e) => updateRow(index, { description: e.target.value })}
                  rows={2}
                  className="flex-1 border border-slate/40 bg-cream px-2 py-1.5 text-sm text-ink"
                />
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  aria-label="Remove row"
                  className="shrink-0 border border-slate/40 px-2.5 py-1.5 font-mono text-xs text-slate transition-colors hover:border-rose-gold hover:text-rose-gold"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {commitError && (
            <p role="alert" className="mt-4 text-sm text-rose-gold">
              {commitError}
            </p>
          )}

          <button
            type="button"
            onClick={handleCommit}
            disabled={pending || rows.length === 0}
            className="mt-4 bg-ink px-4 py-2.5 text-sm font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Importing…" : `Import ${rows.length} standard${rows.length === 1 ? "" : "s"}`}
          </button>
        </div>
      )}

      {commitMessage && <p className="text-sm text-slate">{commitMessage}</p>}
    </div>
  );
}
