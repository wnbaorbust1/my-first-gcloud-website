"use client";

import { ChevronDown, ChevronUp, Download, Image as ImageIcon, Mail, Printer, Save } from "lucide-react";
import { useCallback, useEffect, useState, type RefObject } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type ActionKey = "pdf" | "png" | "email" | "version";

interface SavedVersion {
  id: string;
  version: number;
  createdAt: string;
  createdBy: { firstName: string; lastName: string } | null;
}

/**
 * DOWNLOADS TOOLBAR (Phase 6: Downloads) — everything a member can do
 * with their completed, unlocked Vision Board once it exists as real
 * rendered HTML:
 *
 *  - Download as PDF (the reliable, one-click primary — a real .pdf
 *    file every time, not dependent on the member correctly navigating
 *    their OS's own Print dialog the way "Print" is).
 *  - Download as PNG, rendered straight from the same completed HTML
 *    the member is looking at (html2canvas), never a separately
 *    maintained image template.
 *  - Print My Vision Board — the original browser Print/Save-as-PDF
 *    path, kept as its own explicit action since some members
 *    genuinely want a physical printout, not a file.
 *  - Email My Blueprint — the same client-rendered PDF, attached and
 *    sent to the member's own verified account email server-side.
 *  - Save New Version — a real, inspectable checkpoint of the board's
 *    current content (src/app/api/blueprint/vision-board/versions).
 *
 * PDF and PNG are both generated from the *same* captured canvas of the
 * real DOM (`boardRef`) — "PNG should be generated from the completed
 * HTML board" and PDF is just that canvas dropped into a same-size PDF
 * page, so the two can never visually drift from each other or from
 * what's on screen.
 */
export function BoardDownloadToolbar({
  boardRef,
  businessId,
  fileBaseName,
}: {
  boardRef: RefObject<HTMLElement | null>;
  businessId: string;
  /** Slug used for the downloaded file names, e.g. "daniels-leisure-travel-vision-board". */
  fileBaseName: string;
}) {
  const [pending, setPending] = useState<ActionKey | null>(null);
  const [status, setStatus] = useState<{ variant: "success" | "danger"; message: string } | null>(null);
  const [versions, setVersions] = useState<SavedVersion[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const refreshVersions = useCallback(async () => {
    try {
      const res = await fetch(`/api/blueprint/vision-board/versions?businessId=${encodeURIComponent(businessId)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return (data.versions ?? []) as SavedVersion[];
    } catch {
      return null;
    }
  }, [businessId]);

  useEffect(() => {
    let cancelled = false;
    refreshVersions().then((next) => {
      if (!cancelled && next) setVersions(next);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshVersions]);

  function logDownload(format: "pdf" | "png" | "print") {
    fetch("/api/blueprint/board-downloads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, document: "vision_board", format }),
    }).catch(() => {
      // Logging is best-effort — never block or interrupt the download.
    });
  }

  async function captureCanvas(): Promise<HTMLCanvasElement> {
    if (!boardRef.current) {
      throw new Error("Board isn't ready to capture yet.");
    }
    const { default: html2canvas } = await import("html2canvas");
    return html2canvas(boardRef.current, {
      backgroundColor: "#fffdf9",
      // 1.5x is plenty crisp for a document meant to be read on screen or
      // printed at normal size, and matters a lot here: the board's own
      // dotted background texture (WorksheetPage) is exactly the kind of
      // fine repeating detail that blows up a naive PNG capture's size.
      scale: 1.5,
      useCORS: true,
    });
  }

  async function canvasToPdfBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    const { default: jsPDF } = await import("jspdf");
    const pdf = new jsPDF({
      orientation: canvas.width >= canvas.height ? "landscape" : "portrait",
      unit: "px",
      format: [canvas.width, canvas.height],
    });
    // JPEG, not PNG, for the embedded page image — a real reliability
    // concern, not just file size: the same PDF bytes are what "Email My
    // Blueprint" attaches, and this board's dotted background texture
    // makes a full-quality PNG embed unnecessarily huge (tens of MB) for
    // no visible benefit in a document meant to be read, not zoomed into
    // pixel-by-pixel. 0.92 is visually lossless for this content.
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, canvas.width, canvas.height);
    return pdf.output("blob");
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  async function run(action: ActionKey, fn: () => Promise<void>) {
    setPending(action);
    setStatus(null);
    try {
      await fn();
    } catch {
      setStatus({
        variant: "danger",
        message:
          action === "pdf"
            ? "Couldn't generate your PDF. Try again, or use Print instead."
            : action === "png"
              ? "Couldn't generate your PNG. Try again."
              : action === "email"
                ? "Couldn't send that email. Try again."
                : "Couldn't save a version right now. Try again.",
      });
    } finally {
      setPending(null);
    }
  }

  function handlePdf() {
    return run("pdf", async () => {
      const canvas = await captureCanvas();
      const blob = await canvasToPdfBlob(canvas);
      triggerDownload(blob, `${fileBaseName}.pdf`);
      logDownload("pdf");
    });
  }

  function handlePng() {
    return run("png", async () => {
      const canvas = await captureCanvas();
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Canvas produced no image data.");
      triggerDownload(blob, `${fileBaseName}.png`);
      logDownload("png");
    });
  }

  function handlePrint() {
    logDownload("print");
    window.print();
  }

  function handleEmail() {
    return run("email", async () => {
      const canvas = await captureCanvas();
      const blob = await canvasToPdfBlob(canvas);
      const pdfBase64 = await blobToBase64(blob);
      const res = await fetch("/api/blueprint/vision-board/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, pdfBase64 }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setStatus({ variant: "danger", message: data?.error ?? "Couldn't send that email. Try again." });
        return;
      }
      setStatus({ variant: "success", message: `Sent to ${data.sentTo}.` });
    });
  }

  function handleSaveVersion() {
    return run("version", async () => {
      const res = await fetch("/api/blueprint/vision-board/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setStatus({ variant: "danger", message: data?.error ?? "Couldn't save a version right now." });
        return;
      }
      setStatus({ variant: "success", message: `Version ${data.version.version} saved — ${new Date(data.version.createdAt).toLocaleString()}.` });
      const next = await refreshVersions();
      if (next) setVersions(next);
      setShowHistory(true);
    });
  }

  return (
    <div className="no-print flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={handlePdf} disabled={pending !== null}>
          <Download className="h-4 w-4" aria-hidden="true" />
          {pending === "pdf" ? "Generating…" : "Download as PDF"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={handlePng} disabled={pending !== null}>
          <ImageIcon className="h-4 w-4" aria-hidden="true" />
          {pending === "png" ? "Generating…" : "Download as PNG"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={handlePrint} disabled={pending !== null}>
          <Printer className="h-4 w-4" aria-hidden="true" />
          Print My Vision Board
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={handleEmail} disabled={pending !== null}>
          <Mail className="h-4 w-4" aria-hidden="true" />
          {pending === "email" ? "Sending…" : "Email My Blueprint"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={handleSaveVersion} disabled={pending !== null}>
          <Save className="h-4 w-4" aria-hidden="true" />
          {pending === "version" ? "Saving…" : "Save New Version"}
        </Button>
      </div>
      {status && <Alert variant={status.variant}>{status.message}</Alert>}

      {versions.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-medium text-navy-500 hover:text-navy-800"
          >
            {showHistory ? (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Version History ({versions.length})
          </button>
          {showHistory && (
            <ul className="mt-2 flex flex-col gap-1 rounded-xl border border-navy-100 bg-surface-muted p-3 text-xs text-navy-600">
              {versions.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3">
                  <span>Version {v.version}</span>
                  <span className="text-navy-400">
                    {new Date(v.createdAt).toLocaleString()}
                    {v.createdBy ? ` · ${v.createdBy.firstName} ${v.createdBy.lastName}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
