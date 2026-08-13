import { Button } from "@/components/ui/button";
import { STAGE_META, type Stage } from "@/lib/utils";

const TRANSITION_COPY: Record<Stage, { complete: string; next: string }> = {
  PASSION: {
    complete: "You've explored the clarity and purpose behind your business.",
    next: "Now we'll explore the systems that help turn your vision into results.",
  },
  POWER: {
    complete: "You've explored the systems that turn your vision into consistent execution.",
    next: "Now let's look at what makes your business built to last.",
  },
  LEGACY: {
    complete: "You've explored what makes your business built to last.",
    next: "",
  },
};

interface StageTransitionProps {
  completedStage: Stage;
  nextStage: Stage;
  onContinue: () => void;
}

export function StageTransition({ completedStage, nextStage, onContinue }: StageTransitionProps) {
  const completedMeta = STAGE_META[completedStage];
  const nextMeta = STAGE_META[nextStage];
  const copy = TRANSITION_COPY[completedStage];

  return (
    <div className="mx-auto max-w-lg text-center">
      <span className="text-4xl" aria-hidden="true">
        {completedMeta.icon}
      </span>
      <h2 className="mt-4 font-display text-2xl font-semibold text-navy-900">
        {completedMeta.label} Complete
      </h2>
      <p className="mt-2 text-foreground-muted">{copy.complete}</p>

      <div className="my-8 h-px bg-navy-100" />

      <p className="text-sm font-semibold uppercase tracking-wide text-navy-400">Next</p>
      <h3 className="mt-2 font-display text-xl font-semibold text-navy-900">
        <span aria-hidden="true">{nextMeta.icon}</span> Let&apos;s Look at Your Business{" "}
        {nextMeta.label}
      </h3>
      <p className="mt-2 text-foreground-muted">{copy.next}</p>

      <Button size="lg" className="mt-8" onClick={onContinue}>
        Continue to {nextMeta.label}
      </Button>
    </div>
  );
}
