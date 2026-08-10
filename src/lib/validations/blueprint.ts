import { z } from "zod";

export const editSectionSchema = z.object({
  businessId: z.string().min(1),
  title: z.string().min(1),
  content: z.string().trim().max(8000),
});
