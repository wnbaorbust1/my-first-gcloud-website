import { z } from "zod";

export const swapNextBestActionSchema = z.object({
  businessId: z.string().min(1),
  currentTaskId: z.string().min(1),
});
