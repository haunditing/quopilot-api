import { Router } from "express";
import {
  createProductController,
  deleteProductController,
  getProductController,
  getProductsController,
  updateProductController,
  updateProductStatusController,
} from "../controllers/product-controller.js";
import { authenticate } from "../middleware/auth-middleware.js";
import { authorize } from "../middleware/authorize.js";
import { requireTenant } from "../middleware/tenant-middleware.js";

const router = Router();

router.get("/", authenticate, requireTenant, getProductsController);

router.get(
  "/:productId",
  authenticate,
  requireTenant,
  getProductController,
);

router.post(
  "/",
  authenticate,
  authorize("TENANT_ADMIN"),
  requireTenant,
  createProductController,
);

router.patch(
  "/:productId",
  authenticate,
  authorize("TENANT_ADMIN"),
  requireTenant,
  updateProductController,
);

router.patch(
  "/:productId/status",
  authenticate,
  authorize("TENANT_ADMIN"),
  requireTenant,
  updateProductStatusController,
);

router.delete(
  "/:productId",
  authenticate,
  authorize("TENANT_ADMIN"),
  requireTenant,
  deleteProductController,
);

export default router;
