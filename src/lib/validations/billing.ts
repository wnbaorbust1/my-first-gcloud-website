import { z } from "zod";

export const startCheckoutSchema = z.object({
  businessId: z.string().min(1),
  plan: z.enum(["MONTHLY", "ANNUAL"]),
});

export const businessIdSchema = z.object({
  businessId: z.string().min(1),
});

export const grantMembershipSchema = z.object({
  status: z.enum(["SPONSORED", "ADMIN_GRANTED"]),
  reason: z.string().trim().min(1).max(500),
});
