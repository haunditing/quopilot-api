import { Router } from "express";
import { authenticate } from "../middleware/auth-middleware.js";
import { authorize } from "../middleware/authorize.js";
import { requireTenant } from "../middleware/tenant-middleware.js";
import {
  createTenantController,
  getCurrentTenantCapabilitiesController,
  getCurrentTenantController,
  getCurrentTenantUsageController,
  getTenantController,
  getTenantsController,
  getTenantUsersController,
  getTenantUsageController,
  getTenantSubscriptionController,
  updateCurrentTenantController,
  updateTenantController,
  updateTenantPlanController,
  updateTenantStatusController,
  updateTenantSubscriptionController,
} from "../controllers/tenant-controller.js";

import "../capabilities/tenants.js";

const router = Router();

router.get("/me", authenticate, requireTenant, getCurrentTenantController);
router.get("/me/capabilities", authenticate, requireTenant, getCurrentTenantCapabilitiesController);
router.get("/me/usage", authenticate, requireTenant, getCurrentTenantUsageController);

router.patch(
  "/me",
  authenticate,
  authorize("TENANT_ADMIN"),
  requireTenant,
  updateCurrentTenantController,
);

router.use(authenticate, authorize("SUPER_ADMIN"));

router.get("/", getTenantsController);
router.get("/:tenantId/users", getTenantUsersController);
router.get("/:tenantId/usage", getTenantUsageController);
router.get("/:tenantId/subscription", getTenantSubscriptionController);
router.get("/:tenantId", getTenantController);
router.post("/", createTenantController);
router.patch("/:tenantId", updateTenantController);
router.patch("/:tenantId/plan", updateTenantPlanController);
router.patch("/:tenantId/subscription", updateTenantSubscriptionController);
router.patch("/:tenantId/status", updateTenantStatusController);

export default router;
