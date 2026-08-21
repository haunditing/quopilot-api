
import { Router } from "express";
import { getSuperAdminDashboardController } from "../controllers/super-admin-dashboard-controller.js";
import { authenticate } from "../middleware/auth-middleware.js";

import "../capabilities/superAdmin.js";

const router = Router();

router.get(
  "/summary",
  authenticate,
  getSuperAdminDashboardController,
);

export default router;
