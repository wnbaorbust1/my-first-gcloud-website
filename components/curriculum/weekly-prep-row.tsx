"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { togglePrepItemCompletedAction } from "@/lib/teacher/prep-actions";
import { LedgerRow } from "@/components/ui/ledger-row";
import { DAY_LABELS } from "@/lib/curriculum/constants";
import type { PrepItemWithLessonContext } from "@/lib/teacher/prep-queries";
import { cn } from "@/lib/utils";

/** One row in the weekly cross-lesson prep checklist — same checkbox
 * pattern as the lesson-scoped list, plus a link back to the lesson it's
 * for since this view spans every lesson at once. */
export function WeeklyPrepRow({ item }: { item: PrepItemWithLessonContext }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await togglePrepItemCompletedAction({ prepItemId: item.id, completed: !item.completed });
      router.refresh();
    });
  }

  const lessonHref = `/curriculum/${item.lesson.week.course.slug}/${item.lesson.week.week_number}/${item.lesson.day_number}`;

  return (
    <LedgerRow meta={item.due_date ?? ""}>
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={item.completed}
          onChange={toggle}
          disabled={pending}
          className="mt-0.5"
        />
        <span className={cn(item.completed && "text-slate line-through")}>
          {item.description}
          <Link
            href={lessonHref}
            className="ml-2 font-mono text-xs uppercase tracking-wide text-rose-gold hover:underline"
          >
            {item.lesson.week.course.display_name} · Wk {item.lesson.week.week_number} ·{" "}
            {DAY_LABELS[item.lesson.day_number] ?? `Day ${item.lesson.day_number}`}
          </Link>
        </span>
      </label>
    </LedgerRow>
  );
}
