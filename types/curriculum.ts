import type { Database } from "@/types/supabase";

export type Course = Database["public"]["Tables"]["courses"]["Row"];
export type Unit = Database["public"]["Tables"]["units"]["Row"];
export type Week = Database["public"]["Tables"]["weeks"]["Row"];
export type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
export type LessonSegment = Database["public"]["Tables"]["lesson_segments"]["Row"];
export type Teks = Database["public"]["Tables"]["teks"]["Row"];

export type UnitWithWeeks = Unit & { weeks: Week[] };

export type WeekWithLessons = Week & { lessons: Lesson[] };

export type LessonDetail = Lesson & {
  segments: LessonSegment[];
  teks: Teks[];
};
