import { Router } from "express";
import {
  deletePlanCapabilitiesController,
  getAssistantCapabilitiesController,
  updateAssistantCapabilitiesController,
  updateToolPermissionController,
} from "../controllers/assistant-capabilities-controller.js";
import { authenticate } from "../middleware/auth-middleware.js";
import { authorize } from "../middleware/authorize.js";

import "../capabilities/superAdmin.js";

const router = Router();

router.use(authenticate, authorize("SUPER_ADMIN"));

router.get("/:planKey", getAssistantCapabilitiesController);
router.put("/:planKey", updateAssistantCapabilitiesController);
router.put("/:planKey/tools/:toolKey", updateToolPermissionController);
router.delete("/:planKey", deletePlanCapabilitiesController);

export default router;