import type { QuestionType } from "@/generated/prisma/enums";
import type { QuestionOption } from "@/lib/assessment/questions";
import type { Stage } from "@/lib/utils";

export interface AssessmentQuestionClient {
  id: string;
  stage: Stage;
  category: string;
  questionType: QuestionType;
  order: number;
  prompt: string;
  helperText: string | null;
  options: QuestionOption[] | null;
  minValue: number | null;
  maxValue: number | null;
  includeInScoring: boolean;
}

/** A response value as stored/sent over the wire — mirrors AssessmentResponse.value's shape per type. */
export type ResponseValue = number | boolean | string | string[];

export type ResponseMap = Record<string, ResponseValue>;
