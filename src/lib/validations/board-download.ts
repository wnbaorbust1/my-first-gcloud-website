import { z } from "zod";

export const logBoardDownloadSchema = z.object({
  businessId: z.string().min(1),
  document: z.enum(["vision_board", "scorecard"]),
  /** Phase 6: Downloads — defaults to "print" for backward compatibility with the existing PrintButton. */
  format: z.enum(["print", "pdf", "png", "email"]).default("print"),
});

/**
 * "Email My Blueprint" (Phase 6: Downloads) — the client renders the
 * board to a PDF itself (html2canvas + jsPDF, the same path "Download
 * as PDF" uses) and posts the base64 bytes here; capped well above a
 * realistic single-page board PDF (a few hundred KB) but far below
 * anything that could be used to smuggle an arbitrary large payload
 * through this endpoint.
 */
export const emailVisionBoardSchema = z.object({
  businessId: z.string().min(1),
  pdfBase64: z
    .string()
    .min(1)
    .max(15_000_000, "That file is too large to email — try downloading it instead."),
});
