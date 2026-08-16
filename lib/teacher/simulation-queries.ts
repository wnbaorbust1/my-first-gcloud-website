import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { SimulationScenario } from "@/types/curriculum";

/** Published scenarios for a course — RLS (simulation_scenarios_select) already limits this to published rows the teacher has course access to. */
export async function getPublishedScenariosForCourse(courseId: string): Promise<SimulationScenario[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("simulation_scenarios")
    .select("*")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getPublishedScenariosForCourse failed", error);
    return [];
  }
  return data;
}

export type AssignmentWithProgress = {
  id: string;
  joinCode: string;
  createdAt: string;
  scenarioTitle: string;
  completedCount: number;
  studentCount: number;
};

/** A class's simulation assignments, each with a quick "N of M students done" count for the list view. */
export async function getAssignmentsForClass(
  classId: string,
  studentCount: number,
): Promise<AssignmentWithProgress[]> {
  const supabase = createClient();
  const { data: assignments, error } = await supabase
    .from("simulation_assignments")
    .select("id, join_code, created_at, scenario:simulation_scenarios(title)")
    .eq("class_id", classId)
    .order("created_at", { ascending: false });

  if (error || !assignments) {
    console.error("getAssignmentsForClass failed", error);
    return [];
  }
  if (assignments.length === 0) return [];

  const { data: runs } = await supabase
    .from("simulation_runs")
    .select("assignment_id, completed_at")
    .in(
      "assignment_id",
      assignments.map((a) => a.id),
    );

  const completedByAssignment = new Map<string, number>();
  for (const run of runs ?? []) {
    if (!run.completed_at) continue;
    completedByAssignment.set(run.assignment_id, (completedByAssignment.get(run.assignment_id) ?? 0) + 1);
  }

  return assignments.map((a) => ({
    id: a.id,
    joinCode: a.join_code,
    createdAt: a.created_at,
    scenarioTitle: (a.scenario as unknown as { title: string } | null)?.title ?? "Deleted scenario",
    completedCount: completedByAssignment.get(a.id) ?? 0,
    studentCount,
  }));
}

export type RunResult = {
  studentId: string;
  studentName: string;
  endingNetWorth: number | null;
  roundsCompleted: number;
  completedAt: string | null;
};

export type AssignmentResults = {
  scenarioTitle: string;
  className: string;
  courseDisplayName: string;
  joinCode: string;
  results: RunResult[];
};

export async function getAssignmentResults(assignmentId: string): Promise<AssignmentResults | null> {
  const supabase = createClient();

  const { data: assignment, error: assignmentError } = await supabase
    .from("simulation_assignments")
    .select(
      "id, join_code, scenario:simulation_scenarios(title), class:classes(name, course:courses(display_name), students(id, name))",
    )
    .eq("id", assignmentId)
    .maybeSingle();

  if (assignmentError || !assignment) {
    console.error("getAssignmentResults failed", assignmentError);
    return null;
  }

  const classInfo = assignment.class as unknown as {
    name: string;
    course: { display_name: string };
    students: { id: string; name: string }[];
  };

  const { data: runs } = await supabase
    .from("simulation_runs")
    .select("student_id, decisions_log, ending_net_worth, completed_at")
    .eq("assignment_id", assignmentId);

  const runsByStudent = new Map((runs ?? []).map((r) => [r.student_id, r]));

  const results: RunResult[] = classInfo.students
    .map((student) => {
      const run = runsByStudent.get(student.id);
      return {
        studentId: student.id,
        studentName: student.name,
        endingNetWorth: run?.ending_net_worth ?? null,
        roundsCompleted: Array.isArray(run?.decisions_log) ? run.decisions_log.length : 0,
        completedAt: run?.completed_at ?? null,
      };
    })
    .sort((a, b) => a.studentName.localeCompare(b.studentName));

  return {
    scenarioTitle: (assignment.scenario as unknown as { title: string } | null)?.title ?? "Deleted scenario",
    className: classInfo.name,
    courseDisplayName: classInfo.course.display_name,
    joinCode: assignment.join_code,
    results,
  };
}
