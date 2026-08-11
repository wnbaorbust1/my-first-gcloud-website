import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getClassWithStudents } from "@/lib/teacher/roster-queries";
import type { Student } from "@/types/curriculum";

export type GradableItem = {
  id: string;
  kind: "assessment" | "assignment";
  title: string;
  unitId: string;
  totalPoints: number;
  teksIds: string[];
};

/** Published assessments + assignments for a course, each with a computed
 * total-points figure — the item picker for grade entry, and the source
 * list the trend chart scopes to a unit / filters by TEKS code from. */
export async function getGradableItemsForCourse(courseId: string): Promise<GradableItem[]> {
  const supabase = createClient();

  const [{ data: assessments }, { data: assignments }] = await Promise.all([
    supabase
      .from("assessments")
      .select("id, title, unit_id, questions, teks_ids")
      .eq("course_id", courseId)
      .eq("status", "published"),
    supabase
      .from("assignments")
      .select("id, title, unit_id, rubric, teks_ids")
      .eq("course_id", courseId)
      .eq("status", "published"),
  ]);

  const items: GradableItem[] = [
    ...(assessments ?? []).map((a) => ({
      id: a.id,
      kind: "assessment" as const,
      title: a.title,
      unitId: a.unit_id,
      totalPoints: a.questions.reduce((sum, q) => sum + q.points, 0) || 100,
      teksIds: a.teks_ids,
    })),
    ...(assignments ?? []).map((a) => ({
      id: a.id,
      kind: "assignment" as const,
      title: a.title,
      unitId: a.unit_id,
      totalPoints: a.rubric.reduce((sum, r) => sum + r.points, 0) || 100,
      teksIds: a.teks_ids,
    })),
  ];

  items.sort((a, b) => a.title.localeCompare(b.title));
  return items;
}

export type GradeEntry = { id: string; score: number; maxScore: number; date: string };

export type GradebookData = {
  className: string;
  courseId: string;
  courseDisplayName: string;
  students: Student[];
  items: GradableItem[];
  // `${kind}:${itemId}:${studentId}` -> existing grade, if any.
  gradesByKey: Record<string, GradeEntry>;
};

function gradeKey(kind: "assessment" | "assignment", itemId: string, studentId: string) {
  return `${kind}:${itemId}:${studentId}`;
}

/** Everything the gradebook page needs in one shot: roster, gradable
 * items, and the current grade (if any) for every (item, student) pair. */
export async function getGradebookData(classId: string): Promise<GradebookData | null> {
  const supabase = createClient();

  const classDetail = await getClassWithStudents(classId);
  if (!classDetail) return null;

  const items = await getGradableItemsForCourse(classDetail.course.id);

  const studentIds = classDetail.students.map((s) => s.id);
  const gradesByKey: Record<string, GradeEntry> = {};

  if (studentIds.length > 0) {
    const { data: grades, error } = await supabase
      .from("grades")
      .select("id, student_id, assessment_id, assignment_id, score, max_score, date")
      .in("student_id", studentIds);

    if (error) {
      console.error("getGradebookData: grades lookup failed", error);
    } else {
      for (const grade of grades ?? []) {
        const kind = grade.assessment_id ? "assessment" : "assignment";
        const itemId = grade.assessment_id ?? grade.assignment_id;
        if (!itemId) continue;
        gradesByKey[gradeKey(kind, itemId, grade.student_id)] = {
          id: grade.id,
          score: grade.score,
          maxScore: grade.max_score,
          date: grade.date,
        };
      }
    }
  }

  return {
    className: classDetail.name,
    courseId: classDetail.course.id,
    courseDisplayName: classDetail.course.display_name,
    students: classDetail.students,
    items,
    gradesByKey,
  };
}

export type TrendPoint = {
  date: string;
  scorePercent: number;
  itemTitle: string;
  itemType: "assessment" | "assignment";
};

/**
 * Score-over-time for one student, or the class average, scoped to a
 * unit and optionally filtered to items tagged with one TEKS code — the
 * gradebook's trend chart. One point per gradable item: student mode is
 * that student's own score; class mode averages every student who has a
 * grade for that item, plotted at the item's earliest grade date.
 */
export async function getTrendData(input: {
  classId: string;
  unitId: string;
  studentId: string | null;
  teksCode: string | null;
}): Promise<TrendPoint[]> {
  const supabase = createClient();

  const classDetail = await getClassWithStudents(input.classId);
  if (!classDetail) return [];

  let items = await getGradableItemsForCourse(classDetail.course.id);
  items = items.filter((item) => item.unitId === input.unitId);

  if (input.teksCode) {
    const { data: teksRow } = await supabase
      .from("teks")
      .select("id")
      .eq("code", input.teksCode)
      .maybeSingle();
    if (teksRow) items = items.filter((item) => item.teksIds.includes(teksRow.id));
  }

  if (items.length === 0) return [];

  const assessmentIds = items.filter((i) => i.kind === "assessment").map((i) => i.id);
  const assignmentIds = items.filter((i) => i.kind === "assignment").map((i) => i.id);

  const studentIds = input.studentId
    ? [input.studentId]
    : classDetail.students.map((s) => s.id);
  if (studentIds.length === 0) return [];

  const [assessmentGrades, assignmentGrades] = await Promise.all([
    assessmentIds.length > 0
      ? supabase
          .from("grades")
          .select("assessment_id, student_id, score, max_score, date")
          .in("assessment_id", assessmentIds)
          .in("student_id", studentIds)
      : Promise.resolve({ data: [] as { assessment_id: string | null; student_id: string; score: number; max_score: number; date: string }[] }),
    assignmentIds.length > 0
      ? supabase
          .from("grades")
          .select("assignment_id, student_id, score, max_score, date")
          .in("assignment_id", assignmentIds)
          .in("student_id", studentIds)
      : Promise.resolve({ data: [] as { assignment_id: string | null; student_id: string; score: number; max_score: number; date: string }[] }),
  ]);

  const itemById = new Map(items.map((i) => [i.id, i]));
  const pointsByItem = new Map<string, { percent: number; date: string }[]>();

  for (const grade of assessmentGrades.data ?? []) {
    if (!grade.assessment_id) continue;
    const list = pointsByItem.get(grade.assessment_id) ?? [];
    list.push({ percent: (grade.score / grade.max_score) * 100, date: grade.date });
    pointsByItem.set(grade.assessment_id, list);
  }
  for (const grade of assignmentGrades.data ?? []) {
    if (!grade.assignment_id) continue;
    const list = pointsByItem.get(grade.assignment_id) ?? [];
    list.push({ percent: (grade.score / grade.max_score) * 100, date: grade.date });
    pointsByItem.set(grade.assignment_id, list);
  }

  const trend: TrendPoint[] = [];
  for (const [itemId, points] of Array.from(pointsByItem.entries())) {
    if (points.length === 0) continue;
    const item = itemById.get(itemId);
    if (!item) continue;
    const avgPercent = points.reduce((sum, p) => sum + p.percent, 0) / points.length;
    const earliestDate = points.map((p) => p.date).sort()[0];
    trend.push({
      date: earliestDate,
      scorePercent: Math.round(avgPercent),
      itemTitle: item.title,
      itemType: item.kind,
    });
  }

  trend.sort((a, b) => a.date.localeCompare(b.date));
  return trend;
}
