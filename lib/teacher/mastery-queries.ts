import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getClassWithStudents } from "@/lib/teacher/roster-queries";
import { BELOW_MASTERY_STATUSES, STRUGGLING_TEKS_THRESHOLD } from "@/lib/curriculum/constants";
import type { Student, Teks } from "@/types/curriculum";
import type { TeksMasteryStatus } from "@/types/supabase";

export type MasteryDashboardData = {
  className: string;
  courseDisplayName: string;
  students: Student[];
  /** Every TEKS code actually tagged on this course's lessons/assignments — the grid's rows. */
  teksCodes: Teks[];
  /** studentId -> teksCode -> status. Every (student, code) pair is present,
   * defaulted to 'not_started' if no mastery row exists yet. */
  statusByStudentAndCode: Record<string, Record<string, TeksMasteryStatus>>;
  /** teksCode -> status -> count, across the whole roster — the chart's data. */
  countsByCode: Record<string, Record<TeksMasteryStatus, number>>;
  /** TEKS codes where enough students are below mastery to flag. */
  strugglingCodes: { teks: Teks; belowMasteryCount: number }[];
};

function emptyStatusCounts(): Record<TeksMasteryStatus, number> {
  return {
    not_started: 0,
    introduced: 0,
    practiced: 0,
    assessed: 0,
    mastered: 0,
    needs_reteaching: 0,
  };
}

export async function getMasteryDashboardData(classId: string): Promise<MasteryDashboardData | null> {
  const supabase = createClient();

  const classDetail = await getClassWithStudents(classId);
  if (!classDetail) return null;

  const students = classDetail.students;

  // Relevant TEKS = union of teks_ids tagged on this course's lessons and
  // assignments. Two small array-column fetches + client-side dedupe,
  // same reasoning as elsewhere in this codebase for avoiding
  // per-array-element joins Postgres can't express directly.
  const [{ data: lessonRows }, { data: assignmentRows }] = await Promise.all([
    supabase.from("lessons").select("teks_ids").eq("course_id", classDetail.course.id),
    supabase.from("assignments").select("teks_ids").eq("course_id", classDetail.course.id),
  ]);

  const teksIdSet = new Set<string>();
  for (const row of lessonRows ?? []) for (const id of row.teks_ids) teksIdSet.add(id);
  for (const row of assignmentRows ?? []) for (const id of row.teks_ids) teksIdSet.add(id);

  let teksCodes: Teks[] = [];
  if (teksIdSet.size > 0) {
    const { data: teksRows, error: teksError } = await supabase
      .from("teks")
      .select("*")
      .in("id", Array.from(teksIdSet))
      .order("code");
    if (teksError) {
      console.error("getMasteryDashboardData teks lookup failed", teksError);
    } else {
      teksCodes = teksRows;
    }
  }

  // Existing mastery rows for this roster.
  const statusByStudentAndCode: Record<string, Record<string, TeksMasteryStatus>> = {};
  for (const student of students) statusByStudentAndCode[student.id] = {};

  if (students.length > 0) {
    const { data: masteryRows, error: masteryError } = await supabase
      .from("teks_mastery")
      .select("student_id, teks_code, status")
      .in(
        "student_id",
        students.map((s) => s.id),
      );

    if (masteryError) {
      console.error("getMasteryDashboardData mastery lookup failed", masteryError);
    } else {
      for (const row of masteryRows ?? []) {
        statusByStudentAndCode[row.student_id][row.teks_code] = row.status;
      }
    }
  }

  // Default every (student, code) pair to 'not_started' so the grid and
  // the counts below never have to special-case "no row yet".
  for (const student of students) {
    for (const teks of teksCodes) {
      if (!(teks.code in statusByStudentAndCode[student.id])) {
        statusByStudentAndCode[student.id][teks.code] = "not_started";
      }
    }
  }

  const countsByCode: Record<string, Record<TeksMasteryStatus, number>> = {};
  for (const teks of teksCodes) {
    const counts = emptyStatusCounts();
    for (const student of students) {
      const status = statusByStudentAndCode[student.id][teks.code];
      counts[status] += 1;
    }
    countsByCode[teks.code] = counts;
  }

  const strugglingCodes = teksCodes
    .map((teks) => {
      const counts = countsByCode[teks.code];
      const belowMasteryCount = BELOW_MASTERY_STATUSES.reduce(
        (sum, status) => sum + counts[status],
        0,
      );
      return { teks, belowMasteryCount };
    })
    .filter((entry) => entry.belowMasteryCount >= STRUGGLING_TEKS_THRESHOLD)
    .sort((a, b) => b.belowMasteryCount - a.belowMasteryCount);

  return {
    className: classDetail.name,
    courseDisplayName: classDetail.course.display_name,
    students,
    teksCodes,
    statusByStudentAndCode,
    countsByCode,
    strugglingCodes,
  };
}
