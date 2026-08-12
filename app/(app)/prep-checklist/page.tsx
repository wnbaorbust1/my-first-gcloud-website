import type { Metadata } from "next";
import { getPrepItemsDueThisWeek, getWeekRange } from "@/lib/teacher/prep-queries";
import { WeeklyPrepRow } from "@/components/curriculum/weekly-prep-row";
import { PREP_CATEGORIES, PREP_CATEGORY_LABELS } from "@/lib/curriculum/constants";
import type { PrepItemWithLessonContext } from "@/lib/teacher/prep-queries";

export const metadata: Metadata = { title: "Prep Checklist — Legacy Command Center" };

function groupByCategory(items: PrepItemWithLessonContext[]) {
  return PREP_CATEGORIES.map((category) => ({
    category,
    items: items.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0);
}

export default async function PrepChecklistPage() {
  const { overdue, thisWeek } = await getPrepItemsDueThisWeek();
  const { start, end } = getWeekRange();

  const overdueGroups = groupByCategory(overdue);
  const thisWeekGroups = groupByCategory(thisWeek);
  const totalCount = thisWeek.length;
  const doneCount = thisWeek.filter((i) => i.completed).length;

  return (
    <div className="mx-auto max-w-3xl">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate">Prep Checklist</p>
      <h1 className="mt-2 font-display text-4xl font-semibold text-ink">
        This week&apos;s prep<span className="text-rose-gold">.</span>
      </h1>
      <p className="mt-2 max-w-xl text-sm text-slate">
        {start} – {end} · Everything due across every lesson, grouped so you can batch it — print
        first, then cut, then test tech, then gather supplies.
      </p>

      {overdueGroups.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-2xl font-semibold text-rose-gold">Overdue</h2>
          {overdueGroups.map((group) => (
            <div key={group.category} className="mt-3">
              <p className="font-mono text-xs uppercase tracking-wide text-slate">
                {PREP_CATEGORY_LABELS[group.category]}
              </p>
              <div className="mt-1 border-t border-rose-gold/40">
                {group.items.map((item) => (
                  <WeeklyPrepRow key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="mt-8 mb-16">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-semibold text-ink">Due This Week</h2>
          <span className="font-mono text-xs text-slate">
            {doneCount} / {totalCount} done
          </span>
        </div>

        {thisWeekGroups.length === 0 ? (
          <p className="mt-4 text-sm text-slate">
            Nothing due this week — add prep items from any lesson&apos;s detail page.
          </p>
        ) : (
          thisWeekGroups.map((group) => (
            <div key={group.category} className="mt-4">
              <p className="font-mono text-xs uppercase tracking-wide text-slate">
                {PREP_CATEGORY_LABELS[group.category]}
              </p>
              <div className="mt-1 border-t border-rose-gold/40">
                {group.items.map((item) => (
                  <WeeklyPrepRow key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
