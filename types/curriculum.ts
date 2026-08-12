import type { Database } from "@/types/supabase";

export type Course = Database["public"]["Tables"]["courses"]["Row"];
export type Unit = Database["public"]["Tables"]["units"]["Row"];
export type Week = Database["public"]["Tables"]["weeks"]["Row"];
export type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
export type LessonSegment = Database["public"]["Tables"]["lesson_segments"]["Row"];
export type Teks = Database["public"]["Tables"]["teks"]["Row"];
export type Assignment = Database["public"]["Tables"]["assignments"]["Row"];
export type Assessment = Database["public"]["Tables"]["assessments"]["Row"];
export type Class = Database["public"]["Tables"]["classes"]["Row"];
export type Student = Database["public"]["Tables"]["students"]["Row"];
export type Grade = Database["public"]["Tables"]["grades"]["Row"];
export type TeksMastery = Database["public"]["Tables"]["teks_mastery"]["Row"];
export type Reflection = Database["public"]["Tables"]["reflections"]["Row"];
export type PrepItem = Database["public"]["Tables"]["prep_items"]["Row"];

export type UnitWithWeeks = Unit & { weeks: Week[] };

export type WeekWithLessons = Week & { lessons: Lesson[] };

export type LessonDetail = Lesson & {
  segments: LessonSegment[];
  teks: Teks[];
};

export type UnitWithAssignments = Unit & { assignments: Assignment[] };

export type UnitWithAssessments = Unit & { assessments: Assessment[] };

export type ClassWithStudents = Class & { students: Student[] };
