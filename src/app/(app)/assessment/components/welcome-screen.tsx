import { ArrowRight, Clock, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { STAGES, STAGE_META } from "@/lib/utils";

interface WelcomeScreenProps {
  businessName: string;
  totalQuestions: number;
  onStart: () => void;
}

export function WelcomeScreen({ businessName, totalQuestions, onStart }: WelcomeScreenProps) {
  const estimatedMinutes = Math.max(5, Math.round(totalQuestions * 0.5));

  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-gold-600">
        Blueprint Assessment
      </p>
      <h1 className="font-display text-3xl font-semibold text-navy-900 sm:text-4xl">
        Discover Your Business Blueprint
      </h1>
      <p className="mx-auto mt-4 max-w-lg text-foreground-muted">
        Find out where {businessName} stands today and what to focus on next.
      </p>

      <div className="mt-10 flex items-center justify-center gap-2 sm:gap-4">
        {STAGES.map((stage, i) => (
          <div key={stage} className="flex items-center gap-2 sm:gap-4">
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-3xl" aria-hidden="true">
                {STAGE_META[stage].icon}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-navy-600">
                {STAGE_META[stage].label}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <ArrowRight className="h-4 w-4 text-navy-300" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>

      <div className="mt-10">
        <Button size="lg" onClick={onStart}>
          Start My Assessment
        </Button>
      </div>

      <div className="mx-auto mt-8 flex max-w-md flex-col gap-2 text-left text-sm text-foreground-muted">
        <p className="flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0 text-navy-400" aria-hidden="true" />
          Takes about {estimatedMinutes} minutes.
        </p>
        <p className="flex items-center gap-2">
          <Save className="h-4 w-4 shrink-0 text-navy-400" aria-hidden="true" />
          Your answers save automatically — come back any time and pick up where you left off.
        </p>
        <p className="text-xs text-foreground-muted">
          Your results determine your Blueprint stage and your recommended Blueprint Session.
        </p>
      </div>
    </div>
  );
}
