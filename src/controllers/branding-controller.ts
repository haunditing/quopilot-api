import type { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth-middleware.js";
import { updateBrandingSchema } from "../schemas/branding-schema.js";
import {
  getBranding,
  updateBranding,
  type BrandingTarget,
} from "../services/branding-service.js";

function resolveTarget(value: unknown, fallback: BrandingTarget = "app"): BrandingTarget {
  return value === "landing" ? "landing" : fallback;
}

/** GET /api/branding?target=app|landing — público. */
export async function getBrandingController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const target = resolveTarget(req.query.target);
    const branding = await getBranding(target);
    res.status(200).json({ ...branding, target });
  } catch (error) {
    handleBrandingError(res, error, "Unable to load branding");
  }
}

/** PUT /api/branding — solo SUPER_ADMIN. Body puede incluir `target`. */
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
    const target = resolveTarget(result.data.target, "app") === "landing" ? "landing" : "app";
    const branding = await updateBranding(target, result.data);
    res.status(200).json({ ...branding, target });
  } catch (error) {
    handleBrandingError(res, error, "Unable to update branding");
  }
}

function handleBrandingError(
  res: Response,
  error: unknown,
  fallbackMessage: string,
): void {
  console.error("[Branding] Error:", error);
  res.status(500).json({ message: fallbackMessage });
}
