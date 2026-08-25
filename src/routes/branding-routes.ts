import { Router } from "express";
import {
  getBrandingController,
  updateBrandingController,
  uploadBrandingImageController,
} from "../controllers/branding-controller.js";
import { authenticate } from "../middleware/auth-middleware.js";
import { authorize } from "../middleware/authorize.js";

import "../capabilities/superAdmin.js";

const router = Router();

// Público: la app web lo consume al cargar para aplicar el tema global.
router.get("/", getBrandingController);

// Gestión de la marca: solo super admin.
router.use(authenticate, authorize("SUPER_ADMIN"));
router.put("/", updateBrandingController);
router.post("/uploads", uploadBrandingImageController);

export default router;
