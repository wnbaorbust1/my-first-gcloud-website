import { z } from "zod";

export const dashboardWelcomeSeenSchema = z.object({
  businessId: z.string().min(1),
});
