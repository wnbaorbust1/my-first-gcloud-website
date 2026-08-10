import type { TaskPriority } from "@/generated/prisma/enums";
import type { Stage } from "@/lib/utils";

export interface TaskTemplateSeed {
  stage: Stage;
  title: string;
  /** Framed as "why this matters" — shown as the task's description on the dashboard. */
  description: string;
  priority: TaskPriority;
  estimatedMins: number;
  order: number;
}

/**
 * Starter roadmap content (spec Prompt 4: "Tasks should come from
 * roadmap priorities"). Deliberately plain checklist items, not the
 * interactive Business Builder workbook activity — that's a future
 * phase (Prompt 3/4 both explicitly exclude "advanced dashboard Builder
 * features"). Real enough that Next Best Action / Today's Blueprint /
 * Roadmap Snapshot all have genuine data to show instead of placeholders.
 */
export const TASK_TEMPLATES: TaskTemplateSeed[] = [
  // ---- PASSION ----
  {
    stage: "PASSION",
    title: "Write your one-sentence business description",
    description:
      "A clear, sayable description makes every other conversation about your business easier — from marketing to referrals.",
    priority: "MUST_DO",
    estimatedMins: 15,
    order: 1,
  },
  {
    stage: "PASSION",
    title: "Define your ideal customer profile",
    description:
      "Knowing exactly who you serve best sharpens your marketing, offer, and messaging all at once.",
    priority: "MUST_DO",
    estimatedMins: 20,
    order: 2,
  },
  {
    stage: "PASSION",
    title: "Set your 12-month business goal",
    description: "A specific goal makes it obvious what to prioritize this month.",
    priority: "SHOULD_DO",
    estimatedMins: 15,
    order: 3,
  },
  {
    stage: "PASSION",
    title: "Draft your mission and vision statement",
    description: "A written vision keeps decisions consistent as the business grows.",
    priority: "SHOULD_DO",
    estimatedMins: 20,
    order: 4,
  },
  {
    stage: "PASSION",
    title: "Identify what makes your business different",
    description: "Clear differentiation gives customers a reason to choose you beyond price.",
    priority: "BONUS",
    estimatedMins: 10,
    order: 5,
  },

  // ---- POWER ----
  {
    stage: "POWER",
    title: "Finalize your pricing strategy",
    description: "Without a clear strategy, prices tend to drift down under pressure.",
    priority: "MUST_DO",
    estimatedMins: 20,
    order: 1,
  },
  {
    stage: "POWER",
    title: "Set up one lead-generation channel",
    description: "A consistent channel is what makes revenue predictable instead of sporadic.",
    priority: "MUST_DO",
    estimatedMins: 30,
    order: 2,
  },
  {
    stage: "POWER",
    title: "Document your sales process",
    description: "A written process makes results repeatable instead of dependent on memory.",
    priority: "SHOULD_DO",
    estimatedMins: 25,
    order: 3,
  },
  {
    stage: "POWER",
    title: "Set up a simple CRM or tracking system",
    description: "Leads that aren't tracked are leads that get forgotten.",
    priority: "SHOULD_DO",
    estimatedMins: 20,
    order: 4,
  },
  {
    stage: "POWER",
    title: "Automate one repetitive task",
    description: "Every automated task is time that goes back into growing the business.",
    priority: "BONUS",
    estimatedMins: 15,
    order: 5,
  },

  // ---- LEGACY ----
  {
    stage: "LEGACY",
    title: "List the tasks only you currently do",
    description: "This is the starting list for what to delegate or systematize next.",
    priority: "MUST_DO",
    estimatedMins: 15,
    order: 1,
  },
  {
    stage: "LEGACY",
    title: "Delegate one recurring task",
    description: "Growth is capped by how much you personally can do — delegating raises the ceiling.",
    priority: "MUST_DO",
    estimatedMins: 20,
    order: 2,
  },
  {
    stage: "LEGACY",
    title: "Document one core process end-to-end",
    description: "Documented systems are what let the business run well without you in every step.",
    priority: "SHOULD_DO",
    estimatedMins: 30,
    order: 3,
  },
  {
    stage: "LEGACY",
    title: "Evaluate a new revenue stream",
    description: "A single revenue source is a single point of failure.",
    priority: "SHOULD_DO",
    estimatedMins: 20,
    order: 4,
  },
  {
    stage: "LEGACY",
    title: "Draft a long-term succession outline",
    description: "Even a rough outline turns \"someday\" into something you're actively building toward.",
    priority: "BONUS",
    estimatedMins: 15,
    order: 5,
  },
];
