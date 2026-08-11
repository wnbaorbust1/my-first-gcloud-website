"use client";

import { useEffect, useState, useTransition } from "react";
import { fetchTrendDataAction } from "@/lib/teacher/gradebook-actions";
import { TrendChart } from "@/components/gradebook/trend-chart";
import type { TrendPoint } from "@/lib/teacher/gradebook-queries";
import type { Student } from "@/types/curriculum";

type UnitOption = { id: string; unitNumber: number; title: string };
type TeksOption = { code: string; description: string };

/** Mastery trend view: score over time for a student or the class
 * average, scoped to a unit and optionally filtered to one TEKS code. */
export function TrendSection({
  classId,
  students,
  units,
  teksOptions,
}: {
  classId: string;
  students: Student[];
  units: UnitOption[];
  teksOptions: TeksOption[];
}) {
  const [mode, setMode] = useState<"class" | "student">("class");
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [unitId, setUnitId] = useState(units[0]?.id ?? "");
  const [teksCode, setTeksCode] = useState("");

  const [points, setPoints] = useState<TrendPoint[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!unitId) {
      setPoints([]);
      return;
    }
    startTransition(async () => {
      const data = await fetchTrendDataAction({
        classId,
        unitId,
        studentId: mode === "student" ? studentId : null,
        teksCode: teksCode || null,
      });
      setPoints(data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, unitId, mode, studentId, teksCode]);

  if (units.length === 0) {
    return null;
  }

  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-semibold text-ink">
        Mastery Trend<span className="text-rose-gold">.</span>
      </h2>
      <p className="mt-1 text-sm text-slate">
        Score over time for a student or the whole class, scoped to a unit — optionally filtered
        to one TEKS code.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label htmlFor="trend-mode" className="block text-sm font-medium text-ink">
            View
          </label>
          <select
            id="trend-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as "class" | "student")}
            className="border border-slate/40 bg-cream px-3 py-2 text-sm text-ink"
          >
            <option value="class">Class average</option>
            <option value="student">Student</option>
          </select>
        </div>

        {mode === "student" && (
          <div className="space-y-1.5">
            <label htmlFor="trend-student" className="block text-sm font-medium text-ink">
              Student
            </label>
            <select
              id="trend-student"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="border border-slate/40 bg-cream px-3 py-2 text-sm text-ink"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="trend-unit" className="block text-sm font-medium text-ink">
            Unit
          </label>
          <select
            id="trend-unit"
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            className="border border-slate/40 bg-cream px-3 py-2 text-sm text-ink"
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                Unit {u.unitNumber}: {u.title}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="trend-teks" className="block text-sm font-medium text-ink">
            TEKS code <span className="font-normal text-slate">(optional)</span>
          </label>
          <select
            id="trend-teks"
            value={teksCode}
            onChange={(e) => setTeksCode(e.target.value)}
            className="border border-slate/40 bg-cream px-3 py-2 text-sm text-ink"
          >
            <option value="">All TEKS</option>
            {teksOptions.map((t) => (
              <option key={t.code} value={t.code}>
                {t.code}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        {pending ? <p className="py-4 text-sm text-slate">Loading…</p> : <TrendChart points={points} />}
      </div>
    </section>
  );
}
