import type { Metadata } from "next";
import Link from "next/link";
import { getClassesForTeacher } from "@/lib/teacher/roster-queries";
import { getAllCourses } from "@/lib/curriculum/queries";
import { CreateClassForm } from "@/components/teks/create-class-form";
import { LedgerRow } from "@/components/ui/ledger-row";

export const metadata: Metadata = { title: "Gradebook — Legacy Command Center" };

export default async function GradebookPage() {
  const [classes, courses] = await Promise.all([getClassesForTeacher(), getAllCourses()]);

  return (
    <div className="mx-auto max-w-3xl">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate">Gradebook</p>
      <h1 className="mt-2 font-display text-4xl font-semibold text-ink">
        Your classes<span className="text-rose-gold">.</span>
      </h1>
      <p className="mt-2 max-w-xl text-sm text-slate">
        Roster, grade entry, and a mastery trend chart per class.
      </p>

      <div className="mt-8 border border-rose-gold/40 bg-cream p-4">
        <CreateClassForm courses={courses} />
      </div>

      {classes.length === 0 ? (
        <p className="mt-8 text-sm text-slate">
          No classes yet — create one above, or open a class you already created in TEKS Mastery.
        </p>
      ) : (
        <div className="mt-8 border-t border-rose-gold/40">
          {classes.map((c) => (
            <LedgerRow key={c.id} meta={c.course.display_name}>
              <Link href={`/gradebook/${c.id}`} className="hover:underline">
                {c.name}
              </Link>
            </LedgerRow>
          ))}
        </div>
      )}
    </div>
  );
}
