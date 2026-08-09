import { z } from "zod";

export const promptStatusSchema = z.enum(["EXPERIMENT", "VERIFIED", "FAVORITE"]);
export const promptOriginSchema = z.enum(["MANUAL", "GENERATED"]);

export const createPromptSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(500).optional(),
  contentZh: z.string().trim().min(1),
  contentEn: z.string().trim().optional(),
  negativeZh: z.string().trim().optional(),
  negativeEn: z.string().trim().optional(),
  modelTaskId: z.string().uuid(),
  categoryId: z.string().uuid().nullable().optional(),
  tagIds: z.array(z.string().uuid()).default([]),
  rating: z.number().int().min(0).max(5).default(0),
  status: promptStatusSchema.default("EXPERIMENT"),
});

export const updatePromptSchema = createPromptSchema.partial().extend({
  changeNote: z.string().trim().max(300).optional(),
});

export type CreatePromptInput = z.infer<typeof createPromptSchema>;
export type UpdatePromptInput = z.infer<typeof updatePromptSchema>;

export const promptListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().trim().default(""),
  modelTaskId: z.string().uuid().optional(),
  status: promptStatusSchema.optional(),
  tag: z.string().trim().optional(),
});

export type PromptListQuery = z.infer<typeof promptListQuerySchema>;
