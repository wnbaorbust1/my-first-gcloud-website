import type { MembershipStatus } from "@/generated/prisma/enums";

import { ANNUAL_PRICE_CENTS, MONTHLY_PRICE_CENTS } from "./pricing";

export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  COMPLIMENTARY: "Complimentary (Free Trial)",
  ACTIVE_MONTHLY: "Active — Monthly",
  ACTIVE_ANNUAL: "Active — Annual",
  PAYMENT_ISSUE: "Payment Issue",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
  SPONSORED: "Sponsored",
  ADMIN_GRANTED: "Admin Granted",
};

/** The dollar amount shown as "Amount" on the Billing page for a given status/plan, or null if there isn't one (complimentary/sponsored/admin-granted/expired). */
export function amountCentsFor(status: MembershipStatus, plan: "MONTHLY" | "ANNUAL" | null): number | null {
  if (status === "ACTIVE_MONTHLY") return MONTHLY_PRICE_CENTS;
  if (status === "ACTIVE_ANNUAL") return ANNUAL_PRICE_CENTS;
  if (status === "CANCELLED" && plan) return plan === "ANNUAL" ? ANNUAL_PRICE_CENTS : MONTHLY_PRICE_CENTS;
  return null;
}
