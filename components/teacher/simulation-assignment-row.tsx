"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteAssignmentAction } from "@/lib/teacher/simulation-actions";
import { LedgerRow } from "@/components/ui/ledger-row";
import type { AssignmentWithProgress } from "@/lib/teacher/simulation-queries";

export function SimulationAssignmentRow({
  assignment,
  classId,
  revalidatePaths,
}: {
  assignment: AssignmentWithProgress;
  classId: string;
  revalidatePaths: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove() {
    if (!confirm(`Delete this assignment? Student results for it will be lost.`)) return;
    startTransition(async () => {
      await deleteAssignmentAction({ assignmentId: assignment.id, revalidatePaths });
      router.refresh();
    });
  }

  // NEXT_PUBLIC_ vars are inlined at build time into both the server and
  // client bundles, so this is identical on first render either side —
  // window.location.origin would differ between SSR and hydration and
  // trigger a mismatch warning.
  const playUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/play/${assignment.joinCode}`;

  return (
    <LedgerRow
      meta={
        <div className="flex items-center gap-2">
          <span>
            {assignment.completedCount} / {assignment.studentCount} done
          </span>
          <Link
            href={`/simulations/${classId}/assignments/${assignment.id}`}
            className="text-rose-gold hover:underline"
          >
            Results
          </Link>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="text-slate transition-colors hover:text-rose-gold disabled:opacity-60"
          >
            Delete
          </button>
        </div>
      }
    >
      <span className="font-medium text-ink">{assignment.scenarioTitle}</span>
      <span className="ml-2 font-mono text-xs text-slate">
        code <span className="font-semibold text-ink">{assignment.joinCode}</span> ·{" "}
        <span className="break-all">{playUrl}</span>
      </span>
    </LedgerRow>
  );
}
