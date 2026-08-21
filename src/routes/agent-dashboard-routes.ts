import { Router } from "express";
import { authenticate } from "../middleware/auth-middleware.js";
import { requireTenant } from "../middleware/tenant-middleware.js";
import { getAgentDashboardController } from "../controllers/agent-dashboard-controller.js";

import "../capabilities/agent.js";

const router = Router();

router.get(
  "/summary",
  authenticate,
  requireTenant,
  getAgentDashboardController,
);

export default router;
