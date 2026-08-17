import { z } from "zod";

const email = z.string().trim().email();
const identificationType = z.enum(["CC", "CE", "NIT", "PASSPORT", "OTHER"]);
const customerType = z.enum(["CUSTOMER", "SUPPLIER"]);

const baseFields = {
  email: email.optional(),
  email2: email.optional(),
  phone: z.string().trim().optional(),
  phone2: z.string().trim().optional(),
  whatsappId: z.string().trim().optional(),
  country: z.string().trim().optional(),
};

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1),
  customerType: customerType.optional(),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  identificationType: identificationType.optional(),
  identificationNumber: z.string().trim().optional(),
  municipality: z.string().trim().optional(),
  department: z.string().trim().optional(),
  address: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  sendStatement: z.boolean().optional(),
  ...baseFields,
});

export const updateCustomerSchema = z.object({
  name: z.string().trim().min(1).optional(),
  customerType: customerType.optional(),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  identificationType: identificationType.optional(),
  identificationNumber: z.string().trim().optional(),
  municipality: z.string().trim().optional(),
  department: z.string().trim().optional(),
  address: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  sendStatement: z.boolean().optional(),
  ...baseFields,
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;