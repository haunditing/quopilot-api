import { Router } from "express";
import { authenticate } from "../middleware/auth-middleware.js";
import { authorize } from "../middleware/authorize.js";
import { requireTenant } from "../middleware/tenant-middleware.js";
import {
  createTenantController,
  getCurrentTenantController,
  getTenantController,
  getTenantsController,
  getTenantUsersController,
  updateTenantController,
  updateTenantStatusController,
} from "../controllers/tenant-controller.js";

const router = Router();

router.get("/me", authenticate, requireTenant, getCurrentTenantController);

router.use(authenticate, authorize("SUPER_ADMIN"));

router.get("/", getTenantsController);
router.get("/:tenantId/users", getTenantUsersController);
router.get("/:tenantId", getTenantController);
router.post("/", createTenantController);
router.patch("/:tenantId", updateTenantController);
router.patch("/:tenantId/status", updateTenantStatusController);

export default router;
