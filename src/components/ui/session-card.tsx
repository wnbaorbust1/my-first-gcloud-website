import { Calendar, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { StageBadge } from "@/components/ui/stage-badge";
import type { Stage } from "@/lib/utils";

interface SessionCardProps {
  title: string;
  stage?: Stage;
  startsAt: Date;
  location?: string;
  ctaLabel?: string;
  onAction?: () => void;
}

export function SessionCard({
  title,
  stage,
  startsAt,
  location,
  ctaLabel = "Reserve My Seat",
  onAction,
}: SessionCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-navy-900">{title}</p>
          <div className="mt-2 flex flex-col gap-1 text-xs text-foreground-muted">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              {startsAt.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </span>
            {location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {location}
              </span>
            )}
          </div>
        </div>
        {stage && <StageBadge stage={stage} />}
      </div>
      <CardFooter>
        <Button size="sm" onClick={onAction} className="w-full">
          {ctaLabel}
        </Button>
      </CardFooter>
    </Card>
  );
}
