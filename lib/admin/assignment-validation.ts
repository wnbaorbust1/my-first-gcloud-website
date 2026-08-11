import { z } from "zod";
import { ASSIGNMENT_TYPES } from "@/lib/curriculum/constants";

const rubricCriterionInputSchema = z.object({
  criterion: z.string().trim().min(1, "Every rubric row needs a criterion.").max(300),
  points: z.number().int().min(1, "Points must be at least 1.").max(100),
  description: z.string().trim().max(1000),
});

export const assignmentSaveSchema = z.object({
  assignmentType: z.enum(ASSIGNMENT_TYPES),
  title: z.string().trim().min(1, "The assignment needs a title.").max(300),
  instructions: z.string().trim().max(4000),
  teacherDirections: z.string().trim().max(4000),
  // The DB requires at least one criterion to publish (mirrored here so a
  // bad request fails with a clear message rather than a raw Postgres
  // error) but allows an empty rubric while drafting.
  rubric: z.array(rubricCriterionInputSchema).max(15),
  answerKey: z.string().trim().max(8000),
  teksIds: z.array(z.string().uuid()).max(20),
});

export type AssignmentSaveInput = z.infer<typeof assignmentSaveSchema>;
