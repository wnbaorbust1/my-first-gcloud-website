"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAdminProfile } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/teacher/roster-actions";

const togglePublishSchema = z.object({
  scenarioId: z.string().uuid(),
  publish: z.boolean(),
  revalidatePaths: z.array(z.string()).max(5),
});

export async function toggleScenarioPublishAction(
  rawInput: z.infer<typeof togglePublishSchema>,
): Promise<ActionResult> {
  const admin = await getAdminProfile();
  if (!admin) {
    return { success: false, error: "Admins only." };
  }

  const parsed = togglePublishSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: "Invalid request." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("simulation_scenarios")
    .update({ status: parsed.data.publish ? "published" : "draft" })
    .eq("id", parsed.data.scenarioId);

  if (error) {
    console.error("toggleScenarioPublishAction failed", error);
    return { success: false, error: error.message };
  }

  for (const path of parsed.data.revalidatePaths) revalidatePath(path);
  return { success: true, data: undefined };
}

const deleteScenarioSchema = z.object({
  scenarioId: z.string().uuid(),
  revalidatePaths: z.array(z.string()).max(5),
});

export async function deleteScenarioAction(
  rawInput: z.infer<typeof deleteScenarioSchema>,
): Promise<ActionResult> {
  const admin = await getAdminProfile();
  if (!admin) {
    return { success: false, error: "Admins only." };
  }

  const parsed = deleteScenarioSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: "Invalid request." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("simulation_scenarios").delete().eq("id", parsed.data.scenarioId);

  if (error) {
    console.error("deleteScenarioAction failed", error);
    return { success: false, error: error.message };
  }

  for (const path of parsed.data.revalidatePaths) revalidatePath(path);
  return { success: true, data: undefined };
}
