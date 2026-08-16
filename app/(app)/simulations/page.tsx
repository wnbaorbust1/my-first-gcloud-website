import type { Metadata } from "next";
import Link from "next/link";
import { getClassesForTeacher } from "@/lib/teacher/roster-queries";
import { LedgerRow } from "@/components/ui/ledger-row";

export const metadata: Metadata = { title: "Financial Simulation — Legacy Command Center" };

export default async function SimulationsIndexPage() {
  const classes = await getClassesForTeacher();

  return (
    <div className="mx-auto max-w-3xl">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate">Financial Simulation</p>
      <h1 className="mt-2 font-display text-4xl font-semibold text-ink">
        Your classes<span className="text-rose-gold">.</span>
      </h1>
      <p className="mt-2 max-w-xl text-sm text-slate">
        Assign a financial life scenario to a class, share the join code with students, and see
        results come in.
      </p>

      {classes.length === 0 ? (
        <p className="mt-8 text-sm text-slate">
          No classes yet — create one from the Gradebook page first.
        </p>
      ) : (
        <div className="mt-8 border-t border-rose-gold/40">
          {classes.map((c) => (
            <LedgerRow key={c.id} meta={c.course.display_name}>
              <Link href={`/simulations/${c.id}`} className="hover:underline">
                {c.name}
              </Link>
            </LedgerRow>
          ))}
        </div>
      )}
    </div>
  );
}
