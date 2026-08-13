import type { Metadata } from "next";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { AI_MODES } from "@/lib/ai/modes";
import { MILESTONE_CATALOG } from "@/lib/progress/milestones";
import { prisma } from "@/lib/prisma";
import { STAGES } from "@/lib/utils";

import { AiPromptTemplateForm } from "./ai-prompt-template-form";
import { ProgramForm } from "./program-form";
import { ProgramRow } from "./program-row";
import { ResourceForm } from "./resource-form";
import { ResourceRow } from "./resource-row";
import { TaskTemplateRow } from "./task-template-row";

export const metadata: Metadata = { title: "Manage Content — Blueprint Admin" };
export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const [taskTemplates, resources, programs, promptOverrides] = await Promise.all([
    prisma.taskTemplate.findMany({ orderBy: [{ stage: "asc" }, { order: "asc" }] }),
    prisma.resource.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.program.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.aiPromptTemplate.findMany(),
  ]);

  const overrideByMode = new Map(promptOverrides.map((o) => [o.mode, o]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy-900">Content</h1>
        <p className="text-sm text-foreground-muted">
          Task &amp; Roadmap Templates, Resources, Milestones, AI Prompt Templates, and Programs.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task Templates (also the Roadmap Template)</CardTitle>
        </CardHeader>
        <p className="mb-3 text-xs text-foreground-muted">
          A business&apos;s roadmap is generated directly from this library — editing a task here
          edits the roadmap template.
        </p>
        <div className="flex flex-col gap-2">
          {STAGES.map((stage) => (
            <div key={stage}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-navy-400">
                {stage}
              </p>
              <div className="flex flex-col gap-2">
                {taskTemplates
                  .filter((t) => t.stage === stage)
                  .map((t) => (
                    <TaskTemplateRow
                      key={t.id}
                      id={t.id}
                      title={t.title}
                      category={t.category}
                      whyItMatters={t.whyItMatters}
                      isActive={t.isActive}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resources</CardTitle>
        </CardHeader>
        <div className="mb-3 flex flex-col gap-2">
          {resources.length === 0 ? (
            <p className="text-sm text-foreground-muted">No resources yet.</p>
          ) : (
            resources.map((r) => (
              <ResourceRow
                key={r.id}
                id={r.id}
                title={r.title}
                category={r.category}
                stage={r.stage}
                isActive={r.isActive}
              />
            ))
          )}
        </div>
        <ResourceForm />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Milestones</CardTitle>
        </CardHeader>
        <p className="mb-3 text-xs text-foreground-muted">
          The 15-milestone catalog is code-defined (each key is referenced by the auto-detection
          engine), so it&apos;s shown here read-only rather than editable — see BUILD_STATUS.md.
        </p>
        <div className="flex flex-wrap gap-2">
          {MILESTONE_CATALOG.map((m) => (
            <span
              key={m.key}
              className="rounded-full bg-navy-50 px-3 py-1 text-xs font-medium text-navy-700"
            >
              {m.label}
              {!m.autoDetectable && " (self-reported)"}
            </span>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Prompt Templates</CardTitle>
        </CardHeader>
        <p className="mb-3 text-xs text-foreground-muted">
          Overrides Blueprint AI&apos;s system-prompt framing per mode. Leave inactive (or don&apos;t
          save changes) to keep the built-in default.
        </p>
        <div className="flex flex-col gap-3">
          {AI_MODES.map((modeMeta) => {
            const override = overrideByMode.get(modeMeta.mode);
            return (
              <AiPromptTemplateForm
                key={modeMeta.mode}
                mode={modeMeta.mode}
                label={modeMeta.label}
                currentFragment={override?.systemPromptFragment ?? modeMeta.systemPromptFragment}
                isOverridden={Boolean(override)}
                isActive={override?.isActive ?? true}
              />
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Programs</CardTitle>
        </CardHeader>
        <div className="mb-3 flex flex-col gap-2">
          {programs.length === 0 ? (
            <p className="text-sm text-foreground-muted">No programs yet.</p>
          ) : (
            programs.map((p) => (
              <ProgramRow key={p.id} id={p.id} name={p.name} description={p.description} isActive={p.isActive} />
            ))
          )}
        </div>
        <ProgramForm />
      </Card>
    </div>
  );
}
