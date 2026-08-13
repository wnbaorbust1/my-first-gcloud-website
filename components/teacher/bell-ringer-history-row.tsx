"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  toggleBellRingerFavoriteAction,
  deleteBellRingerAction,
} from "@/lib/teacher/bell-ringer-actions";
import { LedgerRow } from "@/components/ui/ledger-row";
import { StatusStamp } from "@/components/ui/status-stamp";
import type { BellRinger } from "@/types/curriculum";

/** One past bell ringer — "Present" re-opens the same content in display mode (reuse), rather than re-spending an AI call. */
export function BellRingerHistoryRow({
  bellRinger,
  revalidatePaths,
}: {
  bellRinger: BellRinger;
  revalidatePaths: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggleFavorite() {
    startTransition(async () => {
      await toggleBellRingerFavoriteAction({
        bellRingerId: bellRinger.id,
        favorite: !bellRinger.is_favorite,
        revalidatePaths,
      });
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      await deleteBellRingerAction({ bellRingerId: bellRinger.id, revalidatePaths });
      router.refresh();
    });
  }

  return (
    <LedgerRow
      stamp={bellRinger.is_favorite ? <StatusStamp label="Favorite" /> : null}
      meta={
        <div className="flex items-center gap-2">
          <span>{new Date(bellRinger.created_at).toLocaleDateString()}</span>
          <Link href={`/bell-ringers/display/${bellRinger.id}`} className="text-rose-gold hover:underline">
            Present
          </Link>
          <button
            type="button"
            onClick={toggleFavorite}
            disabled={pending}
            className="text-slate transition-colors hover:text-gold-leaf disabled:opacity-60"
          >
            {bellRinger.is_favorite ? "Unfavorite" : "Favorite"}
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
      <span className="font-medium text-ink">{bellRinger.title}</span>
      {bellRinger.topic && <span className="ml-2 text-sm text-slate">— {bellRinger.topic}</span>}
    </LedgerRow>
  );
}
