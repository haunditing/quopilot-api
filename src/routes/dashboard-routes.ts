import { Router } from "express";
import { getDashboardSummaryController } from "../controllers/dashboard-controller.js";
import { authenticate } from "../middleware/auth-middleware.js";
import { requireTenant } from "../middleware/tenant-middleware.js";

const router = Router();

router.get(
  "/summary",
  authenticate,
  requireTenant,
  getDashboardSummaryController,
);

export default router;
