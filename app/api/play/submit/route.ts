import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The only write in the app that happens without any user session — a
 * student playing at /play/[joinCode] has no Supabase auth of their own.
 * The service-role client bypasses RLS entirely (see
 * lib/supabase/admin.ts), so THIS ROUTE is the authorization boundary:
 * it independently re-verifies that studentId actually belongs to
 * assignmentId's class before writing anything, rather than trusting
 * whatever the client sends.
 */

const decisionSchema = z.object({
  round: z.number().int(),
  prompt: z.string().max(1000),
  choice_label: z.string().max(300),
  impact: z.number(),
  balance_after: z.number(),
});

const requestSchema = z.object({
  assignmentId: z.string().uuid(),
  studentId: z.string().uuid(),
  decisionsLog: z.array(decisionSchema).max(20),
  endingNetWorth: z.number(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }
  const { assignmentId, studentId, decisionsLog, endingNetWorth } = parsed.data;

  const admin = createAdminClient();

  const { data: assignment } = await admin
    .from("simulation_assignments")
    .select("id, class_id")
    .eq("id", assignmentId)
    .maybeSingle();
  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  }

  // The re-check that makes this safe: a submitted studentId must belong
  // to a student on THIS assignment's class roster, not just be some
  // valid uuid.
  const { data: student } = await admin
    .from("students")
    .select("id")
    .eq("id", studentId)
    .eq("class_id", assignment.class_id)
    .maybeSingle();
  if (!student) {
    return NextResponse.json({ error: "That student isn't on this class's roster." }, { status: 403 });
  }

  const { error } = await admin.from("simulation_runs").upsert(
    {
      assignment_id: assignmentId,
      student_id: studentId,
      decisions_log: decisionsLog,
      ending_net_worth: endingNetWorth,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "assignment_id,student_id" },
  );

  if (error) {
    console.error("play/submit: upsert failed", error);
    return NextResponse.json({ error: "Couldn't save your results." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
