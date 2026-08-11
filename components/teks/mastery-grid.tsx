import { MasteryStatusControl } from "@/components/teks/mastery-status-control";
import type { Student, Teks } from "@/types/curriculum";
import type { TeksMasteryStatus } from "@/types/supabase";

/**
 * TEKS codes × roster. A real HTML table (not a stack of <LedgerRow>s —
 * this is genuinely grid-shaped data) but styled to match: thin
 * rose-gold row dividers, mono headers, cream surface. Wrapped in its
 * own horizontal scroll container so a large roster never widens the
 * page itself.
 */
export function MasteryGrid({
  classId,
  teksCodes,
  students,
  statusByStudentAndCode,
}: {
  classId: string;
  teksCodes: Teks[];
  students: Student[];
  statusByStudentAndCode: Record<string, Record<string, TeksMasteryStatus>>;
}) {
  if (teksCodes.length === 0) {
    return (
      <p className="py-4 text-sm text-slate">
        No TEKS codes are tagged on this course&apos;s lessons or assignments yet — tag some in the
        admin editor, then they&apos;ll show up here.
      </p>
    );
  }

  if (students.length === 0) {
    return <p className="py-4 text-sm text-slate">Add students to the roster to start tracking mastery.</p>;
  }

  return (
    <div className="overflow-x-auto border-t border-rose-gold/40">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 bg-cream px-2 py-2 text-left font-mono text-[11px] uppercase tracking-wide text-slate">
              TEKS
            </th>
            {students.map((student) => (
              <th
                key={student.id}
                className="px-2 py-2 text-left font-mono text-[11px] uppercase tracking-wide text-slate"
              >
                {student.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teksCodes.map((teks) => (
            <tr key={teks.id} className="border-t border-rose-gold/20">
              <td className="sticky left-0 max-w-[14rem] bg-cream px-2 py-2 align-top">
                <p className="font-mono text-xs text-ink">{teks.code}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate">{teks.description}</p>
              </td>
              {students.map((student) => (
                <td key={student.id} className="px-2 py-2 align-top">
                  <MasteryStatusControl
                    studentId={student.id}
                    teksCode={teks.code}
                    classId={classId}
                    initialStatus={statusByStudentAndCode[student.id]?.[teks.code] ?? "not_started"}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
