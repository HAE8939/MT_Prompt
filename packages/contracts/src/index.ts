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
  mediaType: z.enum(["IMAGE", "VIDEO"]).optional(),
  origin: promptOriginSchema.optional(),
  categoryId: z.string().uuid().optional(),
  hasEnglish: z.coerce.boolean().optional(),
  hasAsset: z.coerce.boolean().optional(),
  sort: z.enum(["updatedAt", "createdAt", "title", "rating"]).default("updatedAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type PromptListQuery = z.infer<typeof promptListQuerySchema>;

export const bulkPromptUpdateSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  status: promptStatusSchema.optional(),
  categoryId: z.string().uuid().nullable().optional(),
});
export type BulkPromptUpdateInput = z.infer<typeof bulkPromptUpdateSchema>;

export const skillInputSchema = z.object({
  nameZh: z.string().trim().min(1).max(120),
  nameEn: z.string().trim().min(1).max(120),
  descriptionZh: z.string().trim().max(500).default(""),
  descriptionEn: z.string().trim().max(500).default(""),
  contentZh: z.string().trim().min(1),
  contentEn: z.string().trim().min(1),
  category: z.string().trim().min(1).max(60),
  priority: z.number().int().min(0).max(1000).default(100),
  conflictGroup: z.string().trim().max(80).nullable().default(null),
  modelTaskIds: z.array(z.string().uuid()).min(1),
  enabled: z.boolean().default(true),
});

export const templateInputSchema = z.object({
  modelTaskId: z.string().uuid(),
  nameZh: z.string().trim().min(1).max(160),
  nameEn: z.string().trim().min(1).max(160),
  descriptionZh: z.string().trim().max(500).default(""),
  descriptionEn: z.string().trim().max(500).default(""),
  templateZh: z.string().min(1),
  templateEn: z.string().min(1),
  fieldSchema: z.object({ fields: z.array(z.object({ name: z.string().min(1), labelZh: z.string().min(1), labelEn: z.string().min(1), type: z.literal("textarea"), required: z.boolean() })) }),
  enabled: z.boolean().default(true),
});

export type SkillInput = z.infer<typeof skillInputSchema>;
export type TemplateInput = z.infer<typeof templateInputSchema>;
export const skillUpdateSchema = skillInputSchema.partial();
export const templateUpdateSchema = templateInputSchema.partial();
export type SkillUpdateInput = z.infer<typeof skillUpdateSchema>;
export type TemplateUpdateInput = z.infer<typeof templateUpdateSchema>;

export const personalRuleInputSchema = z.object({
  modelTaskId: z.string().uuid().nullable().optional(),
  nameZh: z.string().trim().min(1).max(120),
  nameEn: z.string().trim().min(1).max(120),
  contentZh: z.string().trim().min(1),
  contentEn: z.string().trim().min(1),
  priority: z.number().int().min(0).max(2000).default(1000),
  enabled: z.boolean().default(true),
});
export const personalRuleUpdateSchema = personalRuleInputSchema.partial();
export type PersonalRuleInput = z.infer<typeof personalRuleInputSchema>;
export type PersonalRuleUpdateInput = z.infer<typeof personalRuleUpdateSchema>;

export const compileRequestSchema = z.object({
  modelTaskId: z.string().uuid(),
  templateId: z.string().uuid(),
  skillIds: z.array(z.string().uuid()).default([]),
  inputValues: z.record(z.string(), z.string().trim().min(1)),
});

export type CompileRequest = z.infer<typeof compileRequestSchema>;

export const saveCompilationSchema = z.object({
  title: z.string().trim().min(1).max(160),
});

export type SaveCompilationInput = z.infer<typeof saveCompilationSchema>;

export const translationProviderSchema = z.enum(["openai", "microsoft"]);

export const translationSettingsSchema = z.object({
  provider: translationProviderSchema,
  apiKey: z.string().trim().min(1),
  model: z.string().trim().min(1).default("gpt-5-mini"),
  endpoint: z.string().url().optional(),
  region: z.string().trim().optional(),
});

export type TranslationSettingsInput = z.infer<typeof translationSettingsSchema>;

export const aiProviderSettingsSchema = z.object({
  baseUrl: z.string().url(),
  apiKey: z.string().trim().min(1),
  model: z.string().trim().min(1).default("deepseek-v4-flash"),
});
export type AiProviderSettingsInput = z.infer<typeof aiProviderSettingsSchema>;

export const aiAssistSchema = z.object({
  operation: z.enum(["OPTIMIZE", "VARIANTS", "CONSISTENCY", "REWRITE"]),
  contentZh: z.string().trim().min(1),
  contentEn: z.string().trim().optional(),
  targetModel: z.string().trim().optional(),
});
export type AiAssistInput = z.infer<typeof aiAssistSchema>;

export const aiProposalSaveSchema = z.object({
  contentZh: z.string().trim().min(1),
  contentEn: z.string().trim().nullable().optional(),
  changeNote: z.string().trim().max(300).default("采纳 AI 建议"),
});
export type AiProposalSaveInput = z.infer<typeof aiProposalSaveSchema>;
