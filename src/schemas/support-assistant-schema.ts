import { z } from "zod";

export const sendSupportMessageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
});

export type SendSupportMessageInput = z.infer<
  typeof sendSupportMessageSchema
>;

const llmConfigSchema = z
  .object({
    provider: z.string().trim().optional(),
    apiKey: z.string().trim().optional(),
    model: z.string().trim().optional(),
    baseUrl: z.string().trim().optional(),
    maxTokens: z.number().int().positive().optional(),
    timeoutMs: z.number().int().positive().optional(),
  })
  .optional();

export const updateSupportAssistantConfigSchema = z
  .object({
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    llm: llmConfigSchema,
    systemPrompt: z.string().max(10000).optional(),
    caseThreshold: z.number().min(0).max(1).optional(),
    ragMaxDocs: z.number().int().min(1).max(10).optional(),
    ragMinScore: z.number().min(0).max(1).optional(),
    memoryWindow: z.number().int().min(2).max(30).optional(),
    maxContextTokens: z.number().int().min(500).max(20000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export type UpdateSupportAssistantConfigInput = z.infer<
  typeof updateSupportAssistantConfigSchema
>;

export const createKnowledgeDocSchema = z.object({
  title: z.string().trim().min(1).max(200),
  module: z.string().trim().min(1).max(100),
  summary: z.string().max(1000).optional(),
  content: z.string().min(1).max(20000),
  keywords: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
  enabled: z.boolean().optional(),
});

export type CreateKnowledgeDocInput = z.infer<
  typeof createKnowledgeDocSchema
>;

export const updateKnowledgeDocSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    module: z.string().trim().min(1).max(100).optional(),
    summary: z.string().max(1000).optional(),
    content: z.string().min(1).max(20000).optional(),
    keywords: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
    enabled: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export type UpdateKnowledgeDocInput = z.infer<
  typeof updateKnowledgeDocSchema
>;

export const createSupportCaseSchema = z.object({
  title: z.string().trim().min(1).max(200),
  module: z.string().trim().min(1).max(100),
  problem: z.string().min(1).max(4000),
  solution: z.string().min(1).max(8000),
  keywords: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
  status: z.enum(["RESOLVED", "VERIFIED"]).optional(),
});

export type CreateSupportCaseInput = z.infer<
  typeof createSupportCaseSchema
>;

export const updateSupportCaseSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    module: z.string().trim().min(1).max(100).optional(),
    problem: z.string().min(1).max(4000).optional(),
    solution: z.string().min(1).max(8000).optional(),
    keywords: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
    status: z.enum(["RESOLVED", "VERIFIED"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export type UpdateSupportCaseInput = z.infer<typeof updateSupportCaseSchema>;