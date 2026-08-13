import { z } from "zod";

const AI_MODES = [
  "BUSINESS_COACH",
  "STRATEGIST",
  "COPYWRITER",
  "MARKETING_ASSISTANT",
  "SALES_COACH",
  "SYSTEMS_BUILDER",
  "FINANCE_GUIDE",
  "IMPLEMENTATION_GUIDE",
] as const;

export const aiModeSchema = z.enum(AI_MODES);

export const startConversationSchema = z.object({
  businessId: z.string().min(1),
  message: z.string().trim().min(1).max(6000),
  topic: z.string().trim().max(120).optional(),
  mode: aiModeSchema.optional(),
  relatedTaskId: z.string().min(1).optional(),
  actionType: z.string().trim().max(60).optional(),
});

export const sendMessageSchema = z.object({
  message: z.string().trim().min(1).max(6000),
  mode: aiModeSchema.optional(),
  actionType: z.string().trim().max(60).optional(),
});

export const renameConversationSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  mode: aiModeSchema.optional(),
});

export const favoriteMessageSchema = z.object({
  isFavorite: z.boolean(),
});
