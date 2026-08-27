import { Branding } from "../models/Branding.js";
import type { UpdateBrandingInput } from "../schemas/branding-schema.js";

export type BrandingTarget = "app" | "landing";

export type PublicBranding = {
  logoUrl?: string | null;
  logoWithNameUrl?: string | null;
  faviconUrl?: string | null;
  assistantImageUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  brandName?: string | null;
  fontFamily?: string | null;
};

function toPublicBranding(doc: {
  logoUrl?: string;
  logoWithNameUrl?: string;
  faviconUrl?: string;
  assistantImageUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  brandName?: string;
  fontFamily?: string;
}): PublicBranding {
  return {
    logoUrl: doc.logoUrl ?? null,
    logoWithNameUrl: doc.logoWithNameUrl ?? null,
    faviconUrl: doc.faviconUrl ?? null,
    assistantImageUrl: doc.assistantImageUrl ?? null,
    primaryColor: doc.primaryColor ?? null,
    secondaryColor: doc.secondaryColor ?? null,
    brandName: doc.brandName ?? null,
    fontFamily: doc.fontFamily ?? null,
  };
}

/** Marca de un destino concreto (app por defecto para compatibilidad). */
export async function getBranding(target: BrandingTarget = "app"): Promise<PublicBranding> {
  const doc = await Branding.findOne({ target }).lean();

  if (!doc) {
    const created = await Branding.create({ target });
    return toPublicBranding(created.toObject());
  }

  return toPublicBranding(doc);
}

/** Upsert de la marca de un destino. */
export async function updateBranding(
  target: BrandingTarget,
  input: UpdateBrandingInput,
): Promise<PublicBranding> {
  const doc = await Branding.findOneAndUpdate({ target }, input, {
    upsert: true,
    new: true,
    runValidators: true,
  }).lean();

  return toPublicBranding(doc);
}
