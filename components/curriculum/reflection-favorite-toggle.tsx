"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleFavoriteAction } from "@/lib/teacher/reflection-actions";
import { cn } from "@/lib/utils";

/** Star toggle for a reflection row in the /reflections list — same
 * visual language as the star in the lesson detail quick-entry form. */
export function ReflectionFavoriteToggle({
  reflectionId,
  isFavorite,
}: {
  reflectionId: string;
  isFavorite: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await toggleFavoriteAction({ reflectionId, isFavorite: !isFavorite });
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      className={cn(
        "shrink-0 transition-colors disabled:opacity-60",
        isFavorite ? "text-gold-leaf" : "text-slate/40 hover:text-gold-leaf",
      )}
    >
      <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
        <path
          d="M10 1.5l2.5 5.6 6.1.6-4.6 4.1 1.3 6-5.3-3.2-5.3 3.2 1.3-6-4.6-4.1 6.1-.6z"
          fill={isFavorite ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
