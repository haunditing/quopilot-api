import { z } from "zod";

const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "must be a valid hex color (#RRGGBB)");

const optionalString = z.string().trim().max(500).optional().nullable();
const optionalColor = hexColor.optional().nullable();

export const updateBrandingSchema = z.object({
  logoUrl: optionalString,
  faviconUrl: optionalString,
  primaryColor: optionalColor,
  secondaryColor: optionalColor,
  brandName: z.string().trim().max(80).optional().nullable(),
  fontFamily: z.string().trim().max(120).optional().nullable(),
});

export const uploadImageSchema = z.object({
  filename: z.string().trim().min(1).max(120),
  mime: z.enum(["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"]),
  data: z.string().min(1).regex(/^[A-Za-z0-9+/=\s]+$/, "invalid base64 data"),
});

export type UpdateBrandingInput = z.infer<typeof updateBrandingSchema>;
export type UploadImageInput = z.infer<typeof uploadImageSchema>;
