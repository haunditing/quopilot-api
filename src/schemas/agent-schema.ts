import { z } from "zod";

export const agentToneSchema = z.enum([
  "PROFESSIONAL",
  "FRIENDLY",
  "FORMAL",
  "CASUAL",
  "EMPATHETIC",
]);

export const agentToolSchema = z.enum([
  "PRODUCT_SEARCH",
  "PRODUCT_DETAILS",
  "CUSTOMER_LOOKUP",
  "CUSTOMER_UPDATE",
  "CUSTOMER_HISTORY",
  "QUOTE_HISTORY",
  "QUOTE_DETAILS",
  "QUOTE_DRAFT",
  "QUOTE_UPDATE",
  "SALES_HISTORY",
  "HUMAN_HANDOFF",
]);

export const agentProductScopeSchema = z.enum(["ALL", "SELECTED"]);

export const agentStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

const escalationConfigSchema = z.object({
  enabled: z.boolean().optional(),
  keywords: z.array(z.string().trim()).optional(),
  fallbackMessage: z.string().trim().optional(),
});

const memoryConfigSchema = z.object({
  enabled: z.boolean().optional(),
  messageWindow: z.number().int().min(1).optional(),
  maxContextTokens: z.number().int().min(1000).optional(),
  summarizationEnabled: z.boolean().optional(),
});

const llmConfigSchema = z.object({
  provider: z.string().trim().optional(),
  apiKey: z.string().trim().optional(),
  model: z.string().trim().optional(),
  baseUrl: z.string().trim().optional(),
  maxTokens: z.number().int().min(1).optional(),
  timeoutMs: z.number().int().min(1000).optional(),
});

export const updateAgentSchema = z.object({
  name: z.string().trim().min(1).optional(),
  avatarData: z.string().trim().optional(),
  description: z.string().trim().optional(),
  personality: z.string().trim().optional(),
  systemInstructions: z.string().trim().optional(),
  language: z.string().trim().min(1).optional(),
  tone: agentToneSchema.optional(),
  commercialObjective: z.string().trim().optional(),
  welcomeMessage: z.string().trim().optional(),
  behaviorRules: z.array(z.string().trim()).optional(),
  productScope: agentProductScopeSchema.optional(),
  allowedProductIds: z.array(z.string()).optional(),
  enabledTools: z.array(agentToolSchema).optional(),
  status: agentStatusSchema.optional(),
  escalation: escalationConfigSchema.optional(),
  memory: memoryConfigSchema.optional(),
  llm: llmConfigSchema.optional(),
});

export type AgentToneInput = z.infer<typeof agentToneSchema>;
export type AgentToolInput = z.infer<typeof agentToolSchema>;
export type AgentProductScopeInput = z.infer<typeof agentProductScopeSchema>;
export type AgentStatusInput = z.infer<typeof agentStatusSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
