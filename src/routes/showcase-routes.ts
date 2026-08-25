import { Router } from "express";
import {
  getPublicShowcaseController,
  listShowcaseController,
  createShowcaseController,
} from "../controllers/showcase-controller.js";
import { authenticate } from "../middleware/auth-middleware.js";
import { authorize } from "../middleware/authorize.js";

/** Público: la landing consume las imágenes activas del showcase. */
export const showcasePublicRouter = Router();
showcasePublicRouter.get("/", getPublicShowcaseController);

/** Admin (SUPER_ADMIN): Content Manager puede listar/crear. */
export const showcaseAdminRouter = Router();
showcaseAdminRouter.use(authenticate, authorize("SUPER_ADMIN"));
showcaseAdminRouter.get("/", listShowcaseController);
showcaseAdminRouter.post("/", createShowcaseController);
