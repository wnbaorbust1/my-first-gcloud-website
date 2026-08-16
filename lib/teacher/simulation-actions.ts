"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/teacher/roster-actions";

// Excludes visually-ambiguous characters (0/O, 1/I/L) — this code gets
// read off a projector and typed by hand, so ambiguity costs a whole
// class's worth of "why isn't this working."
const JOIN_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const JOIN_CODE_LENGTH = 6;
const MAX_JOIN_CODE_ATTEMPTS = 5;

function randomJoinCode(): string {
  let code = "";
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
    code += JOIN_CODE_ALPHABET[Math.floor(Math.random() * JOIN_CODE_ALPHABET.length)];
  }
  return code;
}

const assignSchema = z.object({
  classId: z.string().uuid(),
  scenarioId: z.string().uuid(),
  revalidatePaths: z.array(z.string()).max(5),
});

export async function assignScenarioToClassAction(
  rawInput: z.infer<typeof assignSchema>,
): Promise<ActionResult<{ id: string; joinCode: string }>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const parsed = assignSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: "Invalid request." };
  }

  const supabase = createClient();

  // join_code has a unique constraint — retry with a fresh random code on
  // the rare collision rather than pre-checking existence (avoids a
  // check-then-insert race).
  for (let attempt = 0; attempt < MAX_JOIN_CODE_ATTEMPTS; attempt++) {
    const joinCode = randomJoinCode();
    const { data, error } = await supabase
      .from("simulation_assignments")
      .insert({ class_id: parsed.data.classId, scenario_id: parsed.data.scenarioId, join_code: joinCode })
      .select("id, join_code")
      .single();

    if (!error && data) {
      for (const path of parsed.data.revalidatePaths) revalidatePath(path);
      return { success: true, data: { id: data.id, joinCode: data.join_code } };
    }

    // 23505 = unique_violation. Anything else (RLS denial, bad FK) won't
    // be fixed by retrying — surface it immediately.
    if (error?.code !== "23505") {
      console.error("assignScenarioToClassAction failed", error);
      return { success: false, error: error?.message ?? "Couldn't assign that scenario." };
    }
  }

  return { success: false, error: "Couldn't generate a unique join code. Try again." };
}

const deleteAssignmentSchema = z.object({
  assignmentId: z.string().uuid(),
  revalidatePaths: z.array(z.string()).max(5),
});

export async function deleteAssignmentAction(
  rawInput: z.infer<typeof deleteAssignmentSchema>,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const parsed = deleteAssignmentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: "Invalid request." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("simulation_assignments")
    .delete()
    .eq("id", parsed.data.assignmentId);

  if (error) {
    console.error("deleteAssignmentAction failed", error);
    return { success: false, error: error.message };
  }

  for (const path of parsed.data.revalidatePaths) revalidatePath(path);
  return { success: true, data: undefined };
}
