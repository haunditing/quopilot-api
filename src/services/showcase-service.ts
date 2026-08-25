import { ShowcaseImage } from "../models/ShowcaseImage.js";

export interface ShowcaseInput {
  title: string;
  description?: string;
  imageUrl: string;
  order?: number;
  active?: boolean;
}

/** Imágenes públicas activas, ordenadas (las muestra la landing). */
export async function listPublicShowcase() {
  return ShowcaseImage.find({ active: true })
    .sort({ order: 1, createdAt: -1 })
    .lean();
}

export async function listAllShowcase() {
  return ShowcaseImage.find().sort({ order: 1, createdAt: -1 }).lean();
}

export async function createShowcaseImage(input: ShowcaseInput) {
  const doc = await ShowcaseImage.create({
    title: input.title,
    description: input.description ?? "",
    imageUrl: input.imageUrl,
    order: input.order ?? 0,
    active: input.active ?? true,
  });
  return doc.toObject();
}
