import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Class, ClassWithStudents } from "@/types/curriculum";

/**
 * Teacher-owned roster reads. Like the curriculum queries, these rely
 * entirely on RLS (classes_all / students_all) for access control — a
 * teacher only ever gets back their own classes/students, no manual
 * "is this mine" filtering here.
 */

export type ClassWithCourse = Class & { course: { display_name: string } };

export async function getClassesForTeacher(): Promise<ClassWithCourse[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("classes")
    .select("*, course:courses(display_name)")
    .order("created_at");

  if (error) {
    console.error("getClassesForTeacher failed", error);
    return [];
  }
  return data as unknown as ClassWithCourse[];
}

export type ClassDetail = ClassWithStudents & { course: { id: string; display_name: string } };

export async function getClassWithStudents(classId: string): Promise<ClassDetail | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("classes")
    .select("*, students(*), course:courses(id, display_name)")
    .eq("id", classId)
    .maybeSingle();

  if (error) {
    console.error("getClassWithStudents failed", error);
    return null;
  }
  if (!data) return null;

  const result = data as unknown as ClassDetail;
  result.students.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}
