import { Branding } from "../models/Branding.js";
import type { UpdateBrandingInput } from "../schemas/branding-schema.js";

export type PublicBranding = {
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  brandName?: string | null;
  fontFamily?: string | null;
};

function toPublicBranding(doc: {
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  brandName?: string;
  fontFamily?: string;
}): PublicBranding {
  return {
    logoUrl: doc.logoUrl ?? null,
    faviconUrl: doc.faviconUrl ?? null,
    primaryColor: doc.primaryColor ?? null,
    secondaryColor: doc.secondaryColor ?? null,
    brandName: doc.brandName ?? null,
    fontFamily: doc.fontFamily ?? null,
  };
}

export async function getBranding(): Promise<PublicBranding> {
  const doc = await Branding.findOne().lean();

  if (!doc) {
    const created = await Branding.create({});
    return toPublicBranding(created.toObject());
  }

  return toPublicBranding(doc);
}

export async function updateBranding(
  input: UpdateBrandingInput,
): Promise<PublicBranding> {
  const doc = await Branding.findOneAndUpdate({}, input, {
    upsert: true,
    new: true,
    runValidators: true,
  }).lean();

  return toPublicBranding(doc);
}
