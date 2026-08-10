import type { QuestionType } from "@/generated/prisma/enums";
import type { Stage } from "@/lib/utils";

/**
 * The Blueprint Assessment question bank (spec: PASSION/POWER/LEGACY
 * CATEGORIES). Bumping ASSESSMENT_VERSION and changing this array is safe
 * for future assessments — Assessment.assessmentVersion +
 * AssessmentCategoryScore freeze what a *past* assessment actually
 * measured, so editing this file never rewrites history.
 *
 * One representative question per spec category (33 categories total: 8
 * Passion + 13 Power + 12 Legacy) keeps the assessment to "a few minutes,"
 * per the Visual Experience Directive's warning against a dense,
 * government-form-style survey. A handful of non-scale questions
 * (YES_NO, SHORT_ANSWER, NUMBER, MULTIPLE_CHOICE) are mixed in so every
 * question type in the spec is exercised, not just architected.
 */
export const ASSESSMENT_VERSION = "v1";

export interface QuestionOption {
  value: string;
  label: string;
}

export interface QuestionSeed {
  stage: Stage;
  category: string;
  questionType: QuestionType;
  order: number;
  prompt: string;
  helperText?: string;
  options?: QuestionOption[];
  minValue?: number;
  maxValue?: number;
  weight?: number;
  /** Defaults to true; set false for profile/context questions. */
  includeInScoring?: boolean;
}

export const QUESTION_BANK: QuestionSeed[] = [
  // ---- PASSION -------------------------------------------------------
  {
    stage: "PASSION",
    category: "Purpose",
    questionType: "SCALE_1_5",
    order: 1,
    prompt: "I clearly understand why my business exists.",
  },
  {
    stage: "PASSION",
    category: "Vision",
    questionType: "SCALE_1_5",
    order: 2,
    prompt: "I have a mission and/or vision for where my business is headed.",
  },
  {
    stage: "PASSION",
    category: "Ideal Customer",
    questionType: "SCALE_1_5",
    order: 3,
    prompt: "I know who my ideal customer is.",
  },
  {
    stage: "PASSION",
    category: "Customer Problem",
    questionType: "SCALE_1_5",
    order: 4,
    prompt: "I understand my customer's primary problems.",
  },
  {
    stage: "PASSION",
    category: "Offer Clarity",
    questionType: "SCALE_1_5",
    order: 5,
    prompt: "I can explain the problem my business solves, and how.",
  },
  {
    stage: "PASSION",
    category: "Business Clarity",
    questionType: "SCALE_1_5",
    order: 6,
    prompt: "I can explain my business in one or two sentences.",
  },
  {
    stage: "PASSION",
    category: "Positioning",
    questionType: "SCALE_1_5",
    order: 7,
    prompt: "I understand what makes my business different from others.",
  },
  {
    stage: "PASSION",
    category: "Goals",
    questionType: "SCALE_1_5",
    order: 8,
    prompt: "I have clear 12-month business goals.",
  },
  {
    stage: "PASSION",
    category: "Offer Clarity",
    questionType: "SHORT_ANSWER",
    order: 9,
    prompt: "In a sentence or two, what is your main product or service?",
    includeInScoring: false,
  },

  // ---- POWER ----------------------------------------------------------
  {
    stage: "POWER",
    category: "Business Foundation",
    questionType: "YES_NO",
    order: 10,
    prompt:
      "My business is properly registered if required (LLC, sole proprietor, etc.).",
  },
  {
    stage: "POWER",
    category: "Products and Services",
    questionType: "SCALE_1_5",
    order: 11,
    prompt: "My offers, products, and services are clearly defined.",
  },
  {
    stage: "POWER",
    category: "Pricing",
    questionType: "SCALE_1_5",
    order: 12,
    prompt: "I have a clear pricing strategy.",
  },
  {
    stage: "POWER",
    category: "Branding",
    questionType: "SCALE_1_5",
    order: 13,
    prompt: "My brand (name, look, and message) clearly reflects my business.",
  },
  {
    stage: "POWER",
    category: "Marketing",
    questionType: "SCALE_1_5",
    order: 14,
    prompt: "I consistently market my business.",
  },
  {
    stage: "POWER",
    category: "Lead Generation",
    questionType: "SCALE_1_5",
    order: 15,
    prompt: "I have a reliable way to generate and collect leads.",
    helperText: "Think: a consistent channel, not a one-time push.",
  },
  {
    stage: "POWER",
    category: "Sales",
    questionType: "SCALE_1_5",
    order: 16,
    prompt:
      "I have a repeatable sales process and consistently follow up with prospects.",
  },
  {
    stage: "POWER",
    category: "CRM",
    questionType: "YES_NO",
    order: 17,
    prompt: "I track my prospects and customers in a CRM or organized system.",
  },
  {
    stage: "POWER",
    category: "Customer Journey",
    questionType: "SCALE_1_5",
    order: 18,
    prompt: "I have a defined customer onboarding process.",
  },
  {
    stage: "POWER",
    category: "Operations",
    questionType: "SCALE_1_5",
    order: 19,
    prompt: "My core business processes are documented.",
  },
  {
    stage: "POWER",
    category: "Technology",
    questionType: "SCALE_1_5",
    order: 20,
    prompt: "I use technology and tools to save time in my business.",
  },
  {
    stage: "POWER",
    category: "Financial Management",
    questionType: "SCALE_1_5",
    order: 21,
    prompt:
      "I track my revenue and expenses, and I separate business and personal finances.",
  },
  {
    stage: "POWER",
    category: "Automation",
    questionType: "SCALE_1_5",
    order: 22,
    prompt: "I've automated at least one repetitive task in my business.",
    helperText: "e.g. email follow-ups, scheduling, invoicing.",
  },
  {
    stage: "POWER",
    category: "Financial Management",
    questionType: "NUMBER",
    order: 23,
    prompt:
      "Roughly what percentage of your monthly revenue do you currently keep as profit?",
    minValue: 0,
    maxValue: 100,
    includeInScoring: false,
  },

  // ---- LEGACY -----------------------------------------------------------
  {
    stage: "LEGACY",
    category: "Leadership",
    questionType: "SCALE_1_5",
    order: 24,
    prompt: "My business can operate without me completing every task.",
  },
  {
    stage: "LEGACY",
    category: "Delegation",
    questionType: "SCALE_1_5",
    order: 25,
    prompt: "I delegate responsibilities to others.",
  },
  {
    stage: "LEGACY",
    category: "Team",
    questionType: "SCALE_1_5",
    order: 26,
    prompt: "I know which roles I need to hire or outsource.",
  },
  {
    stage: "LEGACY",
    category: "Systems",
    questionType: "SCALE_1_5",
    order: 27,
    prompt: "My business has repeatable, documented systems.",
  },
  {
    stage: "LEGACY",
    category: "Scaling",
    questionType: "SCALE_1_5",
    order: 28,
    prompt:
      "I understand how to increase revenue without increasing my workload at the same rate.",
  },
  {
    stage: "LEGACY",
    category: "Automation Maturity",
    questionType: "SCALE_1_5",
    order: 29,
    prompt:
      "My business relies on documented, automated systems rather than me remembering every step.",
  },
  {
    stage: "LEGACY",
    category: "Revenue Diversification",
    questionType: "SCALE_1_5",
    order: 30,
    prompt:
      "I have multiple revenue streams, or have seriously considered recurring revenue.",
  },
  {
    stage: "LEGACY",
    category: "Intellectual Property",
    questionType: "SCALE_1_5",
    order: 31,
    prompt:
      "I am developing business assets such as courses, templates, processes, or licenses.",
  },
  {
    stage: "LEGACY",
    category: "Strategic Partnerships",
    questionType: "SCALE_1_5",
    order: 32,
    prompt:
      "I have, or am building, strategic partnerships that help grow my business.",
  },
  {
    stage: "LEGACY",
    category: "Succession",
    questionType: "SCALE_1_5",
    order: 33,
    prompt: "I have a long-term succession or exit strategy.",
  },
  {
    stage: "LEGACY",
    category: "Impact",
    questionType: "SCALE_1_5",
    order: 34,
    prompt: "My business creates impact beyond income.",
  },
  {
    stage: "LEGACY",
    category: "Wealth and Long-Term Value",
    questionType: "YES_NO",
    order: 35,
    prompt:
      "I am intentionally building long-term wealth or business value, not just monthly income.",
  },
  {
    stage: "LEGACY",
    category: "Revenue Diversification",
    questionType: "MULTIPLE_CHOICE",
    order: 36,
    prompt: "Which of these are you currently exploring? Select all that apply.",
    options: [
      { value: "new_products", label: "New products or services" },
      { value: "recurring_revenue", label: "Recurring revenue or memberships" },
      { value: "partnerships", label: "Strategic partnerships" },
      { value: "licensing", label: "Licensing or intellectual property" },
      { value: "none", label: "Not exploring any of these yet" },
    ],
    includeInScoring: false,
  },
];
