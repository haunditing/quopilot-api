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
import { requireCapability } from "../middleware/entitlement-middleware.js";
import { requireUsageLimit } from "../services/usage-limit-service.js";

const router = Router();

router.get("/", authenticate, requireTenant, requireCapability("products.view"), getProductsController);

router.get(
  "/:productId",
  authenticate,
  requireTenant,
  requireCapability("products.detail"),
  getProductController,
);

router.post(
  "/",
  authenticate,
  authorize("TENANT_ADMIN"),
  requireTenant,
  requireCapability("products.create"),
  requireUsageLimit("maxProducts"),
  createProductController,
);

router.patch(
  "/:productId",
  authenticate,
  authorize("TENANT_ADMIN"),
  requireTenant,
  requireCapability("products.update"),
  updateProductController,
);

router.patch(
  "/:productId/status",
  authenticate,
  authorize("TENANT_ADMIN"),
  requireTenant,
  requireCapability("products.changeStatus"),
  updateProductStatusController,
);

router.delete(
  "/:productId",
  authenticate,
  authorize("TENANT_ADMIN"),
  requireTenant,
  requireCapability("products.delete"),
  deleteProductController,
);

export default router;
