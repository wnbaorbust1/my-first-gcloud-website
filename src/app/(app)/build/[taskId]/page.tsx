import { ArrowLeft, Clock, Lightbulb, Rocket, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { StageBadge } from "@/components/ui/stage-badge";
import type { InstructionField } from "@/lib/roadmap/task-templates";
import { prisma } from "@/lib/prisma";
import { assertBusinessAccess, requireUser } from "@/lib/session";
import type { Stage } from "@/lib/utils";

import { TaskBuilderForm } from "./task-builder-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ taskId: string }>;
}): Promise<Metadata> {
  const { taskId } = await params;
  const task = await prisma.roadmapTask.findUnique({ where: { id: taskId }, select: { title: true } });
  return { title: task ? `${task.title} — Blueprint Builder` : "Blueprint Builder" };
}

const DIFFICULTY_LABEL: Record<string, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

export default async function BuildTaskPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  const user = await requireUser();

  const task = await prisma.roadmapTask.findUnique({
    where: { id: taskId },
    include: { taskTemplate: true, response: true, roadmap: true },
  });
  if (!task) notFound();

  const allowed = await assertBusinessAccess(user.id, user.role, task.roadmap.businessId);
  if (!allowed) notFound();

  if (task.status === "LOCKED" || task.status === "PAUSED") {
    redirect("/build");
  }

  const template = task.taskTemplate;
  const instructions = (template?.instructions as unknown as InstructionField[]) ?? [];
  const initialAnswers = (task.response?.answers as Record<string, string> | undefined) ?? {};
  const isComplete = task.status === "COMPLETED";

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/build"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Business Builder
      </Link>

      <div className="mt-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <StageBadge stage={task.stage as Stage} />
          <span className="text-xs font-medium text-foreground-muted">{task.category}</span>
          {template && (
            <span className="text-xs font-medium text-foreground-muted">
              {DIFFICULTY_LABEL[template.difficulty]}
            </span>
          )}
          {task.estimatedMins && (
            <span className="inline-flex items-center gap-1 text-xs text-foreground-muted">
              <Clock className="h-3 w-3" aria-hidden="true" />
              ~{task.estimatedMins} min
            </span>
          )}
        </div>
        <h1 className="font-display text-2xl font-semibold uppercase tracking-tight text-navy-900 sm:text-3xl">
          {task.title}
        </h1>
      </div>

      {template?.whyItMatters && (
        <Card className="mt-6 border-gold-200 bg-gold-50/50">
          <div className="mb-1.5 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-gold-600" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-700">
              Why This Matters
            </p>
          </div>
          <p className="text-sm text-navy-800">{template.whyItMatters}</p>
        </Card>
      )}

      {template?.thinkPrompt && (
        <Card className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
            Before You Start
          </p>
          <p className="mt-1.5 text-sm text-foreground-muted">{template.thinkPrompt}</p>
        </Card>
      )}

      <div className="mt-6 rounded-2xl border border-navy-100 bg-surface p-6 sm:p-8">
        <TaskBuilderForm
          taskId={task.id}
          instructions={instructions}
          initialAnswers={initialAnswers}
          isComplete={isComplete}
        />
      </div>

      {(template?.implementGuidance || template?.measurePrompt) && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {template?.implementGuidance && (
            <Card>
              <div className="mb-1.5 flex items-center gap-2">
                <Rocket className="h-4 w-4 text-power-500" aria-hidden="true" />
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                  Implement
                </p>
              </div>
              <p className="text-sm text-foreground-muted">{template.implementGuidance}</p>
            </Card>
          )}
          {template?.measurePrompt && (
            <Card>
              <div className="mb-1.5 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-legacy-500" aria-hidden="true" />
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                  Measure
                </p>
              </div>
              <p className="text-sm text-foreground-muted">{template.measurePrompt}</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
