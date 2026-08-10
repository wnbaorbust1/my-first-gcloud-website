import { ProgressBar } from "@/components/ui/progress-bar";
import { STAGE_META, type Stage } from "@/lib/utils";

interface ProgressHeaderProps {
  stage: Stage;
  questionNumber: number;
  totalQuestions: number;
}

export function ProgressHeader({ stage, questionNumber, totalQuestions }: ProgressHeaderProps) {
  const percent = Math.round((questionNumber / totalQuestions) * 100);
  const meta = STAGE_META[stage];

  return (
    <div className="mb-8">
      <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-navy-400">
        <span>Blueprint Assessment</span>
        <span>
          Question {questionNumber} of {totalQuestions}
        </span>
      </div>
      <ProgressBar value={percent} stage={stage} />
      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-navy-500">
        <span aria-hidden="true">{meta.icon}</span> {meta.label} section
      </p>
    </div>
  );
}
