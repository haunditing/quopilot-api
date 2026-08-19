import { Router } from "express";
import {
  getSupportConfigController,
  updateSupportConfigController,
} from "../controllers/support-assistant-controller.js";
import { authenticate } from "../middleware/auth-middleware.js";
import { authorize } from "../middleware/authorize.js";

const router = Router();

router.use(authenticate, authorize("SUPER_ADMIN"));

router.get("/config", getSupportConfigController);
router.put("/config", updateSupportConfigController);

export default router;