import { z } from "zod";

const email = z.string().trim().email();

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1),
  email: email.optional(),
  phone: z.string().trim().optional(),
  whatsappId: z.string().trim().optional(),
  country: z.string().trim().optional(),
});

export const updateCustomerSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: email.optional(),
  phone: z.string().trim().optional(),
  whatsappId: z.string().trim().optional(),
  country: z.string().trim().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
