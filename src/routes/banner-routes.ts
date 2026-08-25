import { Router } from "express";
import {
  getPublicBannersController,
  listBannersController,
  createBannerController,
  updateBannerController,
  deleteBannerController,
  setBannerActiveController,
} from "../controllers/banner-controller.js";
import { authenticate } from "../middleware/auth-middleware.js";
import { authorize } from "../middleware/authorize.js";

/** Público: la app consume los banners activos. */
export const bannerPublicRouter = Router();
bannerPublicRouter.get("/", getPublicBannersController);

/** Admin (SUPER_ADMIN): CRUD para el panel del CMS. */
export const bannerAdminRouter = Router();
bannerAdminRouter.use(authenticate, authorize("SUPER_ADMIN"));
bannerAdminRouter.get("/", listBannersController);
bannerAdminRouter.post("/", createBannerController);
bannerAdminRouter.put("/:id", updateBannerController);
bannerAdminRouter.patch("/:id/active", setBannerActiveController);
bannerAdminRouter.delete("/:id", deleteBannerController);
