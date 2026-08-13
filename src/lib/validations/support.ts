import { z } from "zod";

export const createSupportRequestSchema = z.object({
  subject: z.string().trim().min(1, "Give it a short subject").max(200),
  message: z.string().trim().min(1, "Tell us what's going on").max(4000),
});
