import type { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth-middleware.js";
import { updateBrandingSchema } from "../schemas/branding-schema.js";
import {
  getBranding,
  updateBranding,
} from "../services/branding-service.js";

/** GET /api/branding — público (la app lo consume en la carga inicial). */
export async function getBrandingController(
  _req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const branding = await getBranding();
    res.status(200).json(branding);
  } catch (error) {
    handleBrandingError(res, error, "Unable to load branding");
  }
}

/** PUT /api/branding — solo SUPER_ADMIN. */
export async function updateBrandingController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const result = updateBrandingSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid branding data",
      errors: result.error.flatten(),
    });
    return;
  }

  try {
    const branding = await updateBranding(result.data);
    res.status(200).json(branding);
  } catch (error) {
    handleBrandingError(res, error, "Unable to update branding");
  }
}

function handleBrandingError(
  res: Response,
  error: unknown,
  fallbackMessage: string,
): void {
  const message = error instanceof Error ? error.message : fallbackMessage;
  console.error("[Branding] Error:", error);
  res.status(500).json({ message: fallbackMessage });
}
