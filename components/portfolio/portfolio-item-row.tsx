"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  togglePortfolioItemFeaturedAction,
  deletePortfolioItemAction,
} from "@/lib/portfolio/actions";
import { LedgerRow } from "@/components/ui/ledger-row";
import { StatusStamp } from "@/components/ui/status-stamp";
import type { PortfolioItemWithAssignment } from "@/lib/portfolio/queries";

/** One portfolio item — signedFileUrl is pre-resolved server-side (Storage signing needs the server client) and passed down rather than fetched client-side. */
export function PortfolioItemRow({
  item,
  signedFileUrl,
  studentName,
  revalidatePaths,
}: {
  item: PortfolioItemWithAssignment;
  signedFileUrl?: string | null;
  /** Shown only in cross-student views (the class showcase); omitted on a single student's own portfolio page. */
  studentName?: string;
  revalidatePaths: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggleFeatured() {
    startTransition(async () => {
      await togglePortfolioItemFeaturedAction({
        itemId: item.id,
        featured: !item.is_featured,
        revalidatePaths,
      });
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      await deletePortfolioItemAction({ itemId: item.id, revalidatePaths });
      router.refresh();
    });
  }

  return (
    <LedgerRow
      stamp={item.is_featured ? <StatusStamp label="Featured" /> : null}
      meta={
        <div className="flex items-center gap-2">
          <span>{item.submitted_date}</span>
          <button
            type="button"
            onClick={toggleFeatured}
            disabled={pending}
            className="text-slate transition-colors hover:text-gold-leaf disabled:opacity-60"
          >
            {item.is_featured ? "Unfeature" : "Feature"}
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="text-slate transition-colors hover:text-rose-gold disabled:opacity-60"
          >
            Remove
          </button>
        </div>
      }
    >
      <div>
        <span className="font-medium text-ink">{item.title}</span>
        {studentName && (
          <span className="ml-2 font-mono text-xs uppercase tracking-wide text-rose-gold">
            {studentName}
          </span>
        )}
        {item.assignment && (
          <span className="ml-2 font-mono text-xs text-slate">from {item.assignment.title}</span>
        )}
      </div>
      {item.description && <p className="mt-1 text-sm text-slate">{item.description}</p>}

      <div className="mt-1.5">
        {item.artifact_type === "file" &&
          (signedFileUrl ? (
            <a
              href={signedFileUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-rose-gold hover:underline"
            >
              View file →
            </a>
          ) : (
            <span className="text-sm text-slate">File unavailable</span>
          ))}
        {item.artifact_type === "link" && item.link_url && (
          <a
            href={item.link_url}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-rose-gold hover:underline"
          >
            {item.link_url} →
          </a>
        )}
        {item.artifact_type === "text" && item.text_content && (
          <p className="whitespace-pre-wrap text-sm text-ink">{item.text_content}</p>
        )}
      </div>

      {item.teacher_notes && (
        <p className="mt-1.5 font-mono text-xs text-slate">Note: {item.teacher_notes}</p>
      )}
    </LedgerRow>
  );
}
