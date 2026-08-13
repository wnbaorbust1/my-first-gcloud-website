import { z } from "zod";

export const logBoardDownloadSchema = z.object({
  businessId: z.string().min(1),
  document: z.enum(["vision_board", "scorecard"]),
});
