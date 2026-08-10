"use client";

import { Zap } from "lucide-react";

import { DeleteButton } from "@/components/tools/delete-button";
import { ReorderButtons } from "@/components/tools/reorder-buttons";

interface AutomationStepCardProps {
  id: string;
  order: number;
  trigger: string;
  action: string;
  tool: string | null;
  timing: string | null;
  owner: string | null;
  message: string | null;
  nextStep: string | null;
  index: number;
  prevId: string | null;
  prevOrder: number | null;
  nextId: string | null;
  nextOrder: number | null;
}

/** One step in the AUTOMATION MAPPER's visual sequence (spec: "Allow visual sequence"). */
export function AutomationStepCard({
  id,
  order,
  trigger,
  action,
  tool,
  timing,
  owner,
  message,
  nextStep,
  index,
  prevId,
  prevOrder,
  nextId,
  nextOrder,
}: AutomationStepCardProps) {
  return (
    <div className="relative pl-10">
      {prevId && <div className="absolute top-0 left-4 h-4 w-px -translate-y-full bg-power-200" aria-hidden="true" />}
      <span className="absolute top-4 left-0 flex h-8 w-8 items-center justify-center rounded-full bg-power-100 text-power-700">
        <Zap className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="rounded-2xl border border-navy-100 bg-surface p-4 shadow-sm shadow-navy-900/5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-power-600">
              Step {index + 1}
            </p>
            <p className="mt-1 text-sm font-semibold text-navy-900">
              When: <span className="font-normal text-navy-700">{trigger}</span>
            </p>
            <p className="mt-0.5 text-sm font-semibold text-navy-900">
              Then: <span className="font-normal text-navy-700">{action}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground-muted">
              {tool && <span>Tool: {tool}</span>}
              {timing && <span>Timing: {timing}</span>}
              {owner && <span>Owner: {owner}</span>}
            </div>
            {message && <p className="mt-2 text-xs text-navy-600">&ldquo;{message}&rdquo;</p>}
            {nextStep && (
              <p className="mt-1 text-xs text-power-700">Next: {nextStep}</p>
            )}
          </div>
          <div className="flex shrink-0 items-start gap-1">
            <ReorderButtons
              endpoint={`/api/tools/automation/${id}`}
              order={order}
              prevEndpoint={prevId ? `/api/tools/automation/${prevId}` : null}
              prevOrder={prevOrder}
              nextEndpoint={nextId ? `/api/tools/automation/${nextId}` : null}
              nextOrder={nextOrder}
            />
            <DeleteButton endpoint={`/api/tools/automation/${id}`} label="" />
          </div>
        </div>
      </div>
    </div>
  );
}
