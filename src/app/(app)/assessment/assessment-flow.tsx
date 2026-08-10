"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { CompletionScreen } from "./components/completion-screen";
import { ProgressHeader } from "./components/progress-header";
import { QuestionInput } from "./components/question-input";
import { StageTransition } from "./components/stage-transition";
import { WelcomeScreen } from "./components/welcome-screen";
import type { AssessmentQuestionClient, ResponseMap, ResponseValue } from "./types";

const DEBOUNCED_TYPES = new Set(["SHORT_ANSWER", "NUMBER"]);
const DEBOUNCE_MS = 600;

interface AssessmentFlowProps {
  assessmentId: string;
  businessName: string;
  questions: AssessmentQuestionClient[];
  initialResponses: ResponseMap;
  hasStarted: boolean;
}

type Phase = "welcome" | "question" | "transition" | "completing";

function firstUnansweredIndex(questions: AssessmentQuestionClient[], responses: ResponseMap) {
  const idx = questions.findIndex((q) => responses[q.id] === undefined);
  return idx === -1 ? questions.length - 1 : idx;
}

export function AssessmentFlow({
  assessmentId,
  businessName,
  questions,
  initialResponses,
  hasStarted,
}: AssessmentFlowProps) {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>(hasStarted ? "question" : "welcome");
  const [currentIndex, setCurrentIndex] = useState(() =>
    hasStarted ? firstUnansweredIndex(questions, initialResponses) : 0,
  );
  const [responses, setResponses] = useState<ResponseMap>(initialResponses);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const nextQuestion = questions[currentIndex + 1];
  const stageChangesNext = nextQuestion && nextQuestion.stage !== currentQuestion.stage;

  const answeredValue = responses[currentQuestion?.id];
  const canAdvance = !currentQuestion.includeInScoring || answeredValue !== undefined;

  async function persist(questionId: string, value: ResponseValue) {
    try {
      const res = await fetch(`/api/assessment/${assessmentId}/responses`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, value }),
      });
      if (!res.ok) {
        setSaveError("We couldn't save that answer. Check your connection and try again.");
      } else {
        setSaveError(null);
      }
    } catch {
      setSaveError("We couldn't save that answer. Check your connection and try again.");
    }
  }

  function handleAnswer(value: ResponseValue) {
    const questionId = currentQuestion.id;
    setResponses((prev) => ({ ...prev, [questionId]: value }));

    if (DEBOUNCED_TYPES.has(currentQuestion.questionType)) {
      clearTimeout(debounceTimers.current[questionId]);
      debounceTimers.current[questionId] = setTimeout(() => {
        void persist(questionId, value);
      }, DEBOUNCE_MS);
    } else {
      void persist(questionId, value);
    }
  }

  function goToQuestion(index: number) {
    setCurrentIndex(index);
    setPhase("question");
  }

  function handleNext() {
    if (isLastQuestion) {
      setPhase("completing");
      return;
    }
    if (stageChangesNext) {
      setPhase("transition");
    } else {
      goToQuestion(currentIndex + 1);
    }
  }

  function handleBack() {
    if (currentIndex === 0) return;
    goToQuestion(currentIndex - 1);
  }

  async function handleViewResults() {
    setIsCompleting(true);
    setCompleteError(null);
    try {
      const res = await fetch(`/api/assessment/${assessmentId}/complete`, { method: "POST" });
      const data = (await res.json().catch(() => null)) as
        | { assessmentId?: string; error?: string }
        | null;
      if (!res.ok) {
        setCompleteError(data?.error ?? "Something went wrong scoring your results.");
        setIsCompleting(false);
        return;
      }
      router.push(`/assessment/results/${assessmentId}`);
    } catch {
      setCompleteError("Something went wrong scoring your results.");
      setIsCompleting(false);
    }
  }

  const questionNumber = useMemo(() => currentIndex + 1, [currentIndex]);

  if (phase === "welcome") {
    return (
      <WelcomeScreen
        businessName={businessName}
        totalQuestions={questions.length}
        onStart={() => setPhase("question")}
      />
    );
  }

  if (phase === "transition" && nextQuestion) {
    return (
      <StageTransition
        completedStage={currentQuestion.stage}
        nextStage={nextQuestion.stage}
        onContinue={() => goToQuestion(currentIndex + 1)}
      />
    );
  }

  if (phase === "completing") {
    return (
      <CompletionScreen
        isSubmitting={isCompleting}
        error={completeError}
        onViewResults={handleViewResults}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ProgressHeader
        stage={currentQuestion.stage}
        questionNumber={questionNumber}
        totalQuestions={questions.length}
      />

      <div className="rounded-2xl border border-navy-100 bg-surface p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-navy-900 sm:text-2xl">
          {currentQuestion.prompt}
        </h2>
        {currentQuestion.helperText && (
          <p className="mt-2 text-sm text-foreground-muted">{currentQuestion.helperText}</p>
        )}

        <div className="mt-6">
          <QuestionInput question={currentQuestion} value={answeredValue} onChange={handleAnswer} />
        </div>

        {saveError && (
          <Alert variant="danger" className="mt-4">
            {saveError}
          </Alert>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={handleBack}
            disabled={currentIndex === 0}
          >
            Back
          </Button>
          <Button type="button" onClick={handleNext} disabled={!canAdvance}>
            {isLastQuestion ? "Finish" : "Save & Continue"}
          </Button>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-foreground-muted">
        Your answers save automatically.{" "}
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="font-medium text-navy-600 underline hover:text-navy-900"
        >
          Save and finish later
        </button>
      </p>
    </div>
  );
}
