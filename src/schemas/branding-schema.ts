import { z } from "zod";

const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "must be a valid hex color (#RRGGBB)");

const optionalColor = hexColor.optional().nullable();

/**
 * Referencia de imagen: una data URI embebida (se guarda en la DB) o una URL
 * http(s) pública.
 */
const imageReference = z
  .string()
  .trim()
  .max(4_000_000)
  .refine(
    (value) =>
      value.length === 0 ||
      /^data:image\/[a-z0-9.+-]+;base64,/i.test(value) ||
      /^https?:\/\//i.test(value),
    "must be a valid image data URI or URL",
  )
  .optional()
  .nullable();

export const updateBrandingSchema = z.object({
  target: z.enum(["app", "landing"]).optional(),
  logoUrl: imageReference,
  faviconUrl: imageReference,
  assistantImageUrl: imageReference,
  primaryColor: optionalColor,
  secondaryColor: optionalColor,
  brandName: z.string().trim().max(80).optional().nullable(),
  fontFamily: z.string().trim().max(120).optional().nullable(),
});

export type UpdateBrandingInput = z.infer<typeof updateBrandingSchema>;
