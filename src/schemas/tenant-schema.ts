import { z } from "zod";

const optionalTrimmedString = z.string().trim().min(1).optional();

export const createTenantSchema = z
  .object({
    name: z.string().trim().min(1),
    legalName: optionalTrimmedString,
    taxId: optionalTrimmedString,
    email: z.string().trim().email(),
    phone: optionalTrimmedString,
    country: optionalTrimmedString,
    currency: z.string().trim().min(1).default("COP"),
    timezone: z.string().trim().min(1).default("America/Bogota"),
    adminName: z.string().trim().min(1),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const updateTenantSchema = z.object({
  name: z.string().trim().min(1).optional(),
  legalName: optionalTrimmedString,
  taxId: optionalTrimmedString,
  email: z.string().trim().email().optional(),
  phone: optionalTrimmedString,
  country: optionalTrimmedString,
  currency: z.string().trim().min(1).optional(),
  timezone: z.string().trim().min(1).optional(),
});

export const updateTenantStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type UpdateTenantStatusInput = z.infer<typeof updateTenantStatusSchema>;
