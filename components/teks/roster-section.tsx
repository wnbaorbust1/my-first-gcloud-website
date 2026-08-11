"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addStudentAction, removeStudentAction } from "@/lib/teacher/roster-actions";
import { LedgerRow } from "@/components/ui/ledger-row";
import type { Student } from "@/types/curriculum";

export function RosterSection({ classId, students }: { classId: string; students: Student[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await addStudentAction({ classId, name });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setName("");
      router.refresh();
    });
  }

  function handleRemove(studentId: string) {
    startTransition(async () => {
      await removeStudentAction({ studentId, classId });
      router.refresh();
    });
  }

  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-semibold text-ink">Roster</h2>
        <span className="font-mono text-xs text-slate">{students.length} students</span>
      </div>

      <form onSubmit={handleAdd} className="mt-3 flex items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <label htmlFor="new-student-name" className="block text-sm font-medium text-ink">
            Add student
          </label>
          <input
            id="new-student-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Student name"
            className="w-full border border-slate/40 bg-cream px-3 py-2 text-sm text-ink placeholder:text-slate/60"
          />
        </div>
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="border border-ink px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-cream disabled:opacity-60"
        >
          Add
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm text-rose-gold">
          {error}
        </p>
      )}

      <div className="mt-4 border-t border-rose-gold/40">
        {students.length === 0 ? (
          <p className="py-4 text-sm text-slate">No students yet — add your roster above.</p>
        ) : (
          students.map((student) => (
            <LedgerRow
              key={student.id}
              meta={
                <button
                  type="button"
                  onClick={() => handleRemove(student.id)}
                  className="text-slate transition-colors hover:text-rose-gold"
                >
                  Remove
                </button>
              }
            >
              {student.name}
            </LedgerRow>
          ))
        )}
      </div>
    </section>
  );
}
