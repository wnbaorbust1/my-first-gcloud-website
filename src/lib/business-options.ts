// Option sets for the Business Profile form (spec Task 10). These are
// plain string arrays — not Prisma enums — precisely so product can add
// or reword an option without a migration. See the schema.prisma header
// comment for the reasoning.

export const BUSINESS_STAGE_OPTIONS = [
  "Idea Stage",
  "Just Launched",
  "Early Growth",
  "Established",
  "Scaling",
];

export const YEARS_IN_BUSINESS_OPTIONS = [
  "Less than 1 year",
  "1–2 years",
  "3–5 years",
  "6–10 years",
  "10+ years",
];

export const ANNUAL_REVENUE_OPTIONS = [
  "Pre-Revenue",
  "Under $10K",
  "$10K–$50K",
  "$50K–$100K",
  "$100K–$250K",
  "$250K–$500K",
  "$500K–$1M",
  "$1M+",
];

export const MONTHLY_REVENUE_OPTIONS = [
  "Pre-Revenue",
  "Under $1K",
  "$1K–$5K",
  "$5K–$10K",
  "$10K–$25K",
  "$25K+",
];

export const EMPLOYEE_COUNT_OPTIONS = [
  "Just me",
  "2–5",
  "6–10",
  "11–25",
  "26+",
];

export const HOURS_PER_WEEK_OPTIONS = [
  "Less than 5",
  "5–10",
  "10–20",
  "20–30",
  "30+",
];

export const WEBSITE_STATUS_OPTIONS = [
  "No website yet",
  "In progress",
  "Live and active",
  "Needs a redesign",
];

export const REGISTRATION_STATUS_OPTIONS = [
  "Not registered yet",
  "Sole proprietor",
  "LLC",
  "S-Corp",
  "C-Corp",
  "Nonprofit",
  "Other",
];
