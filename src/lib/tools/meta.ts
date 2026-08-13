import type { LeadStage, SalesScriptType, ContentCadence, ContentStatus } from "@/generated/prisma/enums";

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  NEW_LEAD: "New Lead",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  PROPOSAL: "Proposal",
  FOLLOW_UP: "Follow-Up",
  WON: "Won",
  LOST: "Lost",
};

/** Ordered left-to-right through the pipeline (CRM board column order). */
export const LEAD_STAGE_ORDER: LeadStage[] = [
  "NEW_LEAD",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "FOLLOW_UP",
  "WON",
  "LOST",
];

export const LEAD_STAGE_CLASSES: Record<LeadStage, string> = {
  NEW_LEAD: "bg-navy-50 text-navy-600 border-navy-200",
  CONTACTED: "bg-power-50 text-power-700 border-power-200",
  QUALIFIED: "bg-power-50 text-power-700 border-power-200",
  PROPOSAL: "bg-gold-50 text-gold-700 border-gold-200",
  FOLLOW_UP: "bg-gold-50 text-gold-700 border-gold-200",
  WON: "bg-legacy-50 text-legacy-700 border-legacy-200",
  LOST: "bg-navy-50 text-navy-400 border-navy-200",
};

export const SALES_SCRIPT_TYPE_LABELS: Record<SalesScriptType, string> = {
  DISCOVERY_CALL: "Discovery Call",
  SALES_CALL: "Sales Call",
  DM_RESPONSE: "DM Response",
  FOLLOW_UP: "Follow-Up",
  OBJECTION_HANDLING: "Objection Handling",
  CLOSING: "Closing",
};

export const SALES_SCRIPT_TYPE_ORDER: SalesScriptType[] = [
  "DISCOVERY_CALL",
  "SALES_CALL",
  "DM_RESPONSE",
  "FOLLOW_UP",
  "OBJECTION_HANDLING",
  "CLOSING",
];

export const CONTENT_CADENCE_LABELS: Record<ContentCadence, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
};

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  IDEA: "Idea",
  DRAFTED: "Drafted",
  SCHEDULED: "Scheduled",
  POSTED: "Posted",
};
