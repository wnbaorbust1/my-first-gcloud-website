"use server";

import { getTrendData, type TrendPoint } from "@/lib/teacher/gradebook-queries";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Thin Server Action wrapper around getTrendData() so the trend chart's
 * student/unit/TEKS controls (client-side, since they're just filtering
 * a chart) can re-fetch without a dedicated Route Handler. RLS still
 * scopes every query inside getTrendData() to the signed-in teacher's
 * own students — this is a read, not a write, so there's nothing to
 * authorize beyond "is anyone signed in."
 */
export async function fetchTrendDataAction(input: {
  classId: string;
  unitId: string;
  studentId: string | null;
  teksCode: string | null;
}): Promise<TrendPoint[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  return getTrendData(input);
}
