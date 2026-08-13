import "server-only";

import { ensureBlueprintDocument } from "@/lib/roadmap/blueprint";
import { prisma } from "@/lib/prisma";
import type { Stage } from "@/lib/utils";

import { BLUEPRINT_SECTIONS } from "./sections";

export interface BlueprintSectionView {
  title: string;
  stage: Stage;
  content: string | null;
  updatedAt: Date | null;
  lastEditedAt: Date | null;
  /** The RoadmapTask that last auto-populated this section, if any. */
  sourceTask: { id: string; title: string; status: string } | null;
  /** A NOT_STARTED/IN_PROGRESS/LOCKED task that (once complete) will populate this section — for the empty-state CTA. */
  builderTask: { id: string; title: string; status: string } | null;
}

/**
 * The full My Blueprint view for one business: every section from the
 * spec's fixed layout (see ./sections.ts), each either populated from a
 * real `DocumentSection` row or shown as an honest empty state — never
 * fabricated content. Grouped by stage, in spec order.
 */
export async function getMyBlueprintData(
  businessId: string,
): Promise<Record<Stage, BlueprintSectionView[]>> {
  const document = await ensureBlueprintDocument(businessId);

  const [sections, roadmap] = await Promise.all([
    prisma.documentSection.findMany({ where: { documentId: document.id } }),
    prisma.roadmap.findFirst({
      where: { businessId },
      include: { tasks: { include: { taskTemplate: true } } },
    }),
  ]);

  const sectionByTitle = new Map(sections.map((s) => [s.title, s]));

  // A roadmap task "belongs" to a section by its template's
  // blueprintDestination — used both to link a completed task as
  // provenance and to give an empty section a "Build this" CTA.
  const taskByDestination = new Map(
    (roadmap?.tasks ?? [])
      .filter((t) => t.taskTemplate?.blueprintDestination)
      .map((t) => [t.taskTemplate!.blueprintDestination as string, t]),
  );

  const result = {} as Record<Stage, BlueprintSectionView[]>;

  for (const stage of Object.keys(BLUEPRINT_SECTIONS) as Stage[]) {
    result[stage] = BLUEPRINT_SECTIONS[stage].map((title) => {
      const section = sectionByTitle.get(title);
      const task = taskByDestination.get(title);
      const sourceTask =
        section?.sourceRoadmapTaskId && task && task.id === section.sourceRoadmapTaskId
          ? { id: task.id, title: task.title, status: task.status }
          : null;

      return {
        title,
        stage,
        content: section?.content ?? null,
        updatedAt: section?.updatedAt ?? null,
        lastEditedAt: section?.lastEditedAt ?? null,
        sourceTask,
        builderTask: !section?.content && task ? { id: task.id, title: task.title, status: task.status } : null,
      };
    });
  }

  return result;
}
