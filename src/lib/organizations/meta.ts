import type { OrganizationType } from "@/generated/prisma/enums";

export const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, string> = {
  NONPROFIT: "Nonprofit",
  SCHOOL: "School",
  COLLEGE: "College",
  GOVERNMENT_PROGRAM: "Government Program",
  CHAMBER: "Chamber",
  INCUBATOR: "Incubator",
  VETERAN_PROGRAM: "Veteran Program",
  WOMENS_ENTREPRENEURSHIP_PROGRAM: "Women's Entrepreneurship Program",
  CORPORATE_PROGRAM: "Corporate Program",
  OTHER: "Other",
};

export const ORGANIZATION_TYPE_ORDER: OrganizationType[] = [
  "NONPROFIT",
  "SCHOOL",
  "COLLEGE",
  "GOVERNMENT_PROGRAM",
  "CHAMBER",
  "INCUBATOR",
  "VETERAN_PROGRAM",
  "WOMENS_ENTREPRENEURSHIP_PROGRAM",
  "CORPORATE_PROGRAM",
  "OTHER",
];

export const COHORT_STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planned",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};
