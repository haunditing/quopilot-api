import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  sku: z.string().trim().optional(),
  unitPrice: z.number().min(0),
  currency: z.string().trim().min(1).default("COP"),
});

export const updateProductSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  sku: z.string().trim().optional(),
  unitPrice: z.number().min(0).optional(),
  currency: z.string().trim().min(1).optional(),
});

export const updateProductStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type UpdateProductStatusInput = z.infer<
  typeof updateProductStatusSchema
>;
