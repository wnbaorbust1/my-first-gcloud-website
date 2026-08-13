import { z } from "zod";

export const updateRoadmapTaskSchema = z.object({
  priority: z.enum(["MUST_DO", "SHOULD_DO", "BONUS"]).optional(),
  /** PAUSED to pause; NOT_STARTED to unlock (bypasses the dependency check on purpose). */
  status: z.enum(["PAUSED", "NOT_STARTED", "LOCKED"]).optional(),
  move: z.enum(["up", "down"]).optional(),
});

export const createRoadmapTaskSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("assign"),
    businessId: z.string().min(1),
    taskTemplateId: z.string().min(1),
  }),
  z.object({
    mode: z.literal("custom"),
    businessId: z.string().min(1),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).optional(),
    stage: z.enum(["PASSION", "POWER", "LEGACY"]),
    category: z.string().trim().min(1).max(120),
    priority: z.enum(["MUST_DO", "SHOULD_DO", "BONUS"]).default("SHOULD_DO"),
    estimatedMins: z.number().int().min(1).max(600).optional(),
  }),
]);
