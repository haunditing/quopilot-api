import { z } from "zod";

const planFeatureSchema = z.object({
  key: z.string().trim().min(1).max(50),
  label: z.string().trim().min(1).max(100),
  description: z.string().max(500).optional(),
  enabled: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const createPlanSchema = z.object({
  key: z.string().trim().min(1).max(20).toUpperCase(),
  name: z.string().trim().min(1).max(100),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  features: z.array(planFeatureSchema).optional(),
  sortOrder: z.number().int().optional(),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;

export const updatePlanSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  features: z.array(planFeatureSchema).optional(),
  sortOrder: z.number().int().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one field must be provided",
});

export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;