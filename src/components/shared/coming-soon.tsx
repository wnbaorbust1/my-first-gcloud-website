import type { LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import type { Stage } from "@/lib/utils";
import { STAGE_META } from "@/lib/utils";

interface ComingSoonProps {
  title: string;
  description: string;
  icon: LucideIcon;
  stage?: Stage;
}

/**
 * Shared placeholder for modules this phase intentionally doesn't build
 * yet (spec Task 2: "Create placeholder routes only when needed for
 * navigation testing"). Every nav destination resolves to a real,
 * on-brand page instead of a 404 or a bare "not implemented" screen.
 */
export function ComingSoon({ title, description, icon, stage }: ComingSoonProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        {stage && (
          <p className="mb-2 text-sm font-semibold text-navy-400">
            {STAGE_META[stage].icon} {STAGE_META[stage].label}
          </p>
        )}
        <h1 className="font-display text-3xl font-semibold text-navy-900">
          {title}
        </h1>
      </div>
      <EmptyState
        icon={icon}
        title="Coming in a future Blueprint phase"
        description={description}
      />
    </div>
  );
}
