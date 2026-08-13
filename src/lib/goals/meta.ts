import { GOAL_CADENCES, GOAL_TYPES } from "@/lib/validations/goal";

export const CADENCE_LABELS: Record<(typeof GOAL_CADENCES)[number], string> = {
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  NINETY_DAY: "90-Day",
  QUARTERLY: "Quarterly",
  ANNUAL: "Annual",
};

export const GOAL_TYPE_LABELS: Record<(typeof GOAL_TYPES)[number], string> = {
  REVENUE: "Revenue",
  PROFIT: "Profit",
  LEADS: "Leads",
  CUSTOMERS: "Customers",
  LAUNCH: "Launch",
  MARKETING: "Marketing",
  SYSTEMS: "Systems",
  TEAM: "Team",
  PERSONAL_CEO: "Personal CEO Goal",
};
