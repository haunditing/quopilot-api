import { Router } from "express";
import { getTenantDashboardController } from "../controllers/tenant-dashboard-controller.js";
import { authenticate } from "../middleware/auth-middleware.js";
import { requireTenant } from "../middleware/tenant-middleware.js";

const router = Router();

router.get(
  "/summary",
  authenticate,
  requireTenant,
  getTenantDashboardController,
);

export default router;
