"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addPrepItemAction,
  togglePrepItemCompletedAction,
  deletePrepItemAction,
} from "@/lib/teacher/prep-actions";
import { PREP_CATEGORIES, PREP_CATEGORY_LABELS, PREP_PRIORITIES, PREP_PRIORITY_LABELS } from "@/lib/curriculum/constants";
import { LedgerRow } from "@/components/ui/ledger-row";
import type { PrepItem } from "@/types/curriculum";
import type { PrepCategory, PrepPriority } from "@/types/supabase";
import { cn } from "@/lib/utils";

function PrepRow({
  item,
  revalidatePaths,
}: {
  item: PrepItem;
  revalidatePaths: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await togglePrepItemCompletedAction({ prepItemId: item.id, completed: !item.completed });
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      await deletePrepItemAction({ prepItemId: item.id, revalidatePaths });
      router.refresh();
    });
  }

  return (
    <LedgerRow
      meta={
        <div className="flex items-center gap-2">
          <span>{PREP_PRIORITY_LABELS[item.priority]}</span>
          {item.due_date && <span>· {item.due_date}</span>}
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
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={item.completed}
          onChange={toggle}
          disabled={pending}
          className="mt-0.5"
        />
        <span className={cn(item.completed && "text-slate line-through")}>
          <span className="font-mono text-xs uppercase tracking-wide text-rose-gold">
            {PREP_CATEGORY_LABELS[item.category]}
          </span>{" "}
          {item.description}
        </span>
      </label>
    </LedgerRow>
  );
}

/** Prep checklist scoped to this one lesson — the weekly cross-lesson
 * view at /prep-checklist is the other half of this feature. */
export function PrepItemsSection({
  lessonId,
  items,
  revalidatePaths,
}: {
  lessonId: string;
  items: PrepItem[];
  revalidatePaths: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<PrepCategory>("materials_to_print");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<PrepPriority>("medium");
  const [error, setError] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await addPrepItemAction({
        lessonId,
        description,
        category,
        dueDate: dueDate || undefined,
        priority,
        revalidatePaths,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setDescription("");
      setDueDate("");
      router.refresh();
    });
  }

  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Prep Checklist<span className="text-rose-gold">.</span>
        </h2>
        <span className="font-mono text-xs text-slate">
          {items.filter((i) => i.completed).length} / {items.length} done
        </span>
      </div>

      <form onSubmit={handleAdd} className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1 space-y-1.5">
          <label htmlFor="prep-description" className="block text-sm font-medium text-ink">
            Item
          </label>
          <input
            id="prep-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Print 30 graphing handouts"
            className="w-full border border-slate/40 bg-cream px-3 py-2 text-sm text-ink placeholder:text-slate/60"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="prep-category" className="block text-sm font-medium text-ink">
            Category
          </label>
          <select
            id="prep-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as PrepCategory)}
            className="border border-slate/40 bg-cream px-3 py-2 text-sm text-ink"
          >
            {PREP_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {PREP_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="prep-due" className="block text-sm font-medium text-ink">
            Due
          </label>
          <input
            id="prep-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="border border-slate/40 bg-cream px-3 py-2 text-sm text-ink"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="prep-priority" className="block text-sm font-medium text-ink">
            Priority
          </label>
          <select
            id="prep-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as PrepPriority)}
            className="border border-slate/40 bg-cream px-3 py-2 text-sm text-ink"
          >
            {PREP_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PREP_PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={pending || !description.trim()}
          className="border border-ink px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-cream disabled:opacity-60"
        >
          + Add
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm text-rose-gold">
          {error}
        </p>
      )}

      <div className="mt-4 border-t border-rose-gold/40">
        {items.length === 0 ? (
          <p className="py-4 text-sm text-slate">Nothing on the prep list for this lesson yet.</p>
        ) : (
          items.map((item) => (
            <PrepRow key={item.id} item={item} revalidatePaths={revalidatePaths} />
          ))
        )}
      </div>
    </section>
  );
}
