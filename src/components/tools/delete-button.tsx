"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Shared delete control for every Phase 10 (Advanced Business Tools)
 * list — one small, consistent affordance instead of eight near-duplicate
 * ones. `confirmText` is asked via the browser's native confirm() since
 * these are low-stakes personal records (a lead, an SOP draft, a content
 * idea), not destructive account-level actions that would need a modal.
 */
export function DeleteButton({
  endpoint,
  confirmText = "Delete this? This can't be undone.",
  label = "Delete",
}: {
  endpoint: string;
  confirmText?: string;
  label?: string;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (typeof window !== "undefined" && !window.confirm(confirmText)) return;
    setIsDeleting(true);
    await fetch(endpoint, { method: "DELETE" });
    setIsDeleting(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      className="inline-flex items-center gap-1 text-xs font-medium text-navy-400 transition-colors hover:text-danger disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      {isDeleting ? "Removing…" : label}
    </button>
  );
}
