import { Router } from "express";
import { getDashboardSummaryController } from "../controllers/dashboard-controller.js";
import { authenticate } from "../middleware/auth-middleware.js";
import { requireTenant } from "../middleware/tenant-middleware.js";
import { requireCapability } from "../middleware/entitlement-middleware.js";

import "../capabilities/dashboard.js";

const router = Router();

router.get(
  "/summary",
  authenticate,
  requireTenant,
  requireCapability("dashboard.view"),
  getDashboardSummaryController,
);

export default router;
