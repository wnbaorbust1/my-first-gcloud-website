"use client";

import { Check } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/form-input";
import { Textarea } from "@/components/ui/textarea";
import { cn, type Stage } from "@/lib/utils";

import type { AssessmentQuestionClient, ResponseValue } from "../types";

const STAGE_SELECTED_CLASSES: Record<Stage, string> = {
  PASSION: "border-passion-400 bg-passion-50 ring-2 ring-passion-200",
  POWER: "border-power-400 bg-power-50 ring-2 ring-power-200",
  LEGACY: "border-legacy-400 bg-legacy-50 ring-2 ring-legacy-200",
};

const STAGE_CHECK_CLASSES: Record<Stage, string> = {
  PASSION: "bg-passion-500 text-white",
  POWER: "bg-power-500 text-white",
  LEGACY: "bg-legacy-500 text-white",
};

const SCALE_LABELS = [
  { value: 1, label: "Not Started / Strongly Disagree" },
  { value: 2, label: "Needs Significant Work" },
  { value: 3, label: "Developing" },
  { value: 4, label: "Strong" },
  { value: 5, label: "Fully Established / Strongly Agree" },
];

interface QuestionInputProps {
  question: AssessmentQuestionClient;
  value: ResponseValue | undefined;
  onChange: (value: ResponseValue) => void;
}

function OptionCard({
  selected,
  stage,
  onClick,
  children,
}: {
  selected: boolean;
  stage: Stage;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-xl border-2 px-5 py-4 text-left text-sm font-medium text-navy-800 transition-colors",
        selected ? STAGE_SELECTED_CLASSES[stage] : "border-navy-100 bg-surface hover:border-navy-200",
      )}
    >
      <span>{children}</span>
      {selected && (
        <span
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
            STAGE_CHECK_CLASSES[stage],
          )}
        >
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      )}
    </button>
  );
}

export function QuestionInput({ question, value, onChange }: QuestionInputProps) {
  switch (question.questionType) {
    case "SCALE_1_5":
      return (
        <div className="flex flex-col gap-3">
          {SCALE_LABELS.map((opt) => (
            <OptionCard
              key={opt.value}
              stage={question.stage}
              selected={value === opt.value}
              onClick={() => onChange(opt.value)}
            >
              <span className="mr-2 font-semibold">{opt.value}</span>
              {opt.label}
            </OptionCard>
          ))}
        </div>
      );

    case "YES_NO":
      return (
        <div className="grid grid-cols-2 gap-3">
          <OptionCard stage={question.stage} selected={value === true} onClick={() => onChange(true)}>
            Yes
          </OptionCard>
          <OptionCard stage={question.stage} selected={value === false} onClick={() => onChange(false)}>
            No
          </OptionCard>
        </div>
      );

    case "SINGLE_CHOICE":
      return (
        <div className="flex flex-col gap-3">
          {(question.options ?? []).map((opt) => (
            <OptionCard
              key={opt.value}
              stage={question.stage}
              selected={value === opt.value}
              onClick={() => onChange(opt.value)}
            >
              {opt.label}
            </OptionCard>
          ))}
        </div>
      );

    case "MULTIPLE_CHOICE": {
      const selected = Array.isArray(value) ? value : [];
      return (
        <div className="flex flex-col gap-3">
          {(question.options ?? []).map((opt) => {
            const isSelected = selected.includes(opt.value);
            return (
              <OptionCard
                key={opt.value}
                stage={question.stage}
                selected={isSelected}
                onClick={() =>
                  onChange(
                    isSelected
                      ? selected.filter((v) => v !== opt.value)
                      : [...selected, opt.value],
                  )
                }
              >
                {opt.label}
              </OptionCard>
            );
          })}
        </div>
      );
    }

    case "SHORT_ANSWER":
      return <ShortAnswerInput value={typeof value === "string" ? value : ""} onChange={onChange} />;

    case "NUMBER":
      return (
        <Input
          type="number"
          inputMode="numeric"
          min={question.minValue ?? undefined}
          max={question.maxValue ?? undefined}
          value={typeof value === "number" ? value : ""}
          onChange={(e) => {
            const n = e.target.value === "" ? undefined : Number(e.target.value);
            if (n !== undefined && Number.isFinite(n)) onChange(n);
          }}
          className="max-w-xs"
        />
      );

    default:
      return null;
  }
}

/** Local buffer so keystrokes don't each trigger a re-render-driven autosave — caller debounces the onChange. */
function ShortAnswerInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [local, setLocal] = useState(value);
  return (
    <Textarea
      value={local}
      onChange={(e) => {
        setLocal(e.target.value);
        onChange(e.target.value);
      }}
      rows={3}
      placeholder="Type your answer…"
    />
  );
}
