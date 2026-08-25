import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth-middleware.js";
import {
  BannerNotFoundError,
  createBanner,
  deleteBanner,
  listAllBanners,
  listPublicBanners,
  setBannerActive,
  updateBanner,
} from "../services/banner-service.js";

/** Normaliza el payload del cliente (flexible: de admin o seed). */
function bannerInput(body: Record<string, unknown>) {
  const props = (body.props ?? {}) as Record<string, unknown>;
  const optString = (v: unknown) => (typeof v === "string" ? v : undefined);
  return {
    slot: String(body.slot ?? "header_global"),
    type: String(body.type ?? "InlineNotice"),
    priority: Number(body.priority ?? 0),
    conditions: Array.isArray(body.conditions) ? body.conditions : [],
    props: {
      variant: optString(props.variant),
      title: optString(props.title),
      message: String(props.message ?? ""),
      ctaText: optString(props.ctaText),
      ctaUrl: optString(props.ctaUrl),
    },
    active: body.active !== false,
  };
}

function notFound(res: Response) {
  res.status(404).json({ message: "Banner not found" });
}

// ---- Público (lo consume la app) ----
export async function getPublicBannersController(_req: Request, res: Response): Promise<void> {
  try {
    const banners = await listPublicBanners();
    res.status(200).json({ banners });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load banners" });
  }
}

// ---- Admin (CRUD, SUPER_ADMIN) ----
export async function listBannersController(_req: Request, res: Response): Promise<void> {
  try {
    const banners = await listAllBanners();
    res.status(200).json(banners);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load banners" });
  }
}

export async function createBannerController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const banner = await createBanner(bannerInput(req.body as Record<string, unknown>));
    res.status(201).json(banner);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error instanceof Error ? error.message : "Unable to create banner" });
  }
}

export async function updateBannerController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const id = String(req.params.id);
  try {
    const banner = await updateBanner(id, bannerInput(req.body as Record<string, unknown>));
    res.status(200).json(banner);
  } catch (error) {
    if (error instanceof BannerNotFoundError) return notFound(res);
    console.error(error);
    res.status(500).json({ message: error instanceof Error ? error.message : "Unable to update banner" });
  }
}

export async function deleteBannerController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    await deleteBanner(String(req.params.id));
    res.status(200).json({ deleted: true });
  } catch (error) {
    if (error instanceof BannerNotFoundError) return notFound(res);
    console.error(error);
    res.status(500).json({ message: "Unable to delete banner" });
  }
}

export async function setBannerActiveController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const banner = await setBannerActive(String(req.params.id), req.body.active === true);
    res.status(200).json(banner);
  } catch (error) {
    if (error instanceof BannerNotFoundError) return notFound(res);
    console.error(error);
    res.status(500).json({ message: "Unable to toggle banner" });
  }
}
