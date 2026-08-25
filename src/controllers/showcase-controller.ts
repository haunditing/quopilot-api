import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth-middleware.js";
import {
  createShowcaseImage,
  listAllShowcase,
  listPublicShowcase,
} from "../services/showcase-service.js";

function input(body: Record<string, unknown>) {
  const opt = (v: unknown) => (typeof v === "string" ? v : undefined);
  return {
    title: String(body.title ?? ""),
    description: opt(body.description),
    imageUrl: String(body.imageUrl ?? ""),
    order: Number(body.order ?? 0),
    active: body.active !== false,
  };
}

/** Público: lo consume la landing */
export async function getPublicShowcaseController(_req: Request, res: Response): Promise<void> {
  try {
    const items = await listPublicShowcase();
    res.status(200).json({ items });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load showcase" });
  }
}

/** Admin (SUPER_ADMIN): lista y crea imágenes del Content Manager */
export async function listShowcaseController(_req: Request, res: Response): Promise<void> {
  try {
    const items = await listAllShowcase();
    res.status(200).json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load showcase" });
  }
}

export async function createShowcaseController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const item = await createShowcaseImage(input(req.body as Record<string, unknown>));
    res.status(201).json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error instanceof Error ? error.message : "Unable to create showcase item" });
  }
}
