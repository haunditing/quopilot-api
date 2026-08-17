import { z } from "zod";

export const quoteItemSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0).optional(),
  discountPercent: z.number().min(0).max(100).optional().default(0),
  taxRate: z.number().min(0).optional().default(0),
});

export const createQuoteSchema = z.object({
  customerId: z.string().trim().min(1),
  conversationId: z.string().trim().optional(),
  items: z.array(quoteItemSchema).min(1),
  validUntil: z.string().datetime().optional(),
  notes: z.string().trim().optional(),
  terms: z.string().trim().optional(),
});

export const updateQuoteSchema = z.object({
  customerId: z.string().trim().min(1),
  items: z.array(quoteItemSchema).min(1),
  validUntil: z.string().datetime().optional(),
  notes: z.string().trim().optional(),
  terms: z.string().trim().optional(),
});

export type CreateQuoteSchemaInput = z.infer<typeof createQuoteSchema>;
export type UpdateQuoteSchemaInput = z.infer<typeof updateQuoteSchema>;
