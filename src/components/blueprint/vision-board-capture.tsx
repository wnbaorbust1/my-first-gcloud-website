"use client";

import { useRef, type ReactNode } from "react";

import { BoardDownloadToolbar } from "@/components/blueprint/board-download-toolbar";

/**
 * Thin client boundary (Phase 6: Downloads) that gives
 * `BoardDownloadToolbar` a real DOM ref to capture — `children` is the
 * server-rendered board itself (the same `WorksheetPage` JSX the "full"
 * state already renders), passed through untouched so this wrapper adds
 * no client-side re-render of the board's own content.
 */
export function VisionBoardCapture({
  businessId,
  fileBaseName,
  children,
}: {
  businessId: string;
  fileBaseName: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div>
      <div className="no-print mb-4">
        <BoardDownloadToolbar boardRef={ref} businessId={businessId} fileBaseName={fileBaseName} />
      </div>
      <div ref={ref}>{children}</div>
    </div>
  );
}
