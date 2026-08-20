import { z } from "zod";

export const usageLimitsSchema = z.object({
  maxCustomers: z.number().int().optional(),
  maxProducts: z.number().int().optional(),
  maxQuotesPerMonth: z.number().int().optional(),
  maxSalesPerMonth: z.number().int().optional(),
  maxActiveAgents: z.number().int().optional(),
  maxChannels: z.number().int().optional(),
  maxAiQueriesPerMonth: z.number().int().optional(),
});

export const createPlanSchema = z.object({
  key: z.string().trim().min(1).max(20).toUpperCase(),
  name: z.string().trim().min(1).max(100),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  enabledFeatures: z.array(z.string().trim().min(1).max(50)).optional(),
  enabledCapabilities: z.array(z.string().trim().min(1).max(100)).optional(),
  usageLimits: usageLimitsSchema.optional(),
  sortOrder: z.number().int().optional(),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;

export const updatePlanSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  enabledFeatures: z.array(z.string().trim().min(1).max(50)).optional(),
  enabledCapabilities: z.array(z.string().trim().min(1).max(100)).optional(),
  usageLimits: usageLimitsSchema.optional(),
  sortOrder: z.number().int().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one field must be provided",
});

export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;