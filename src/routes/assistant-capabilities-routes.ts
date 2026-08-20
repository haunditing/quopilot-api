import { Router } from "express";
import {
  deletePlanCapabilitiesController,
  getAssistantCapabilitiesController,
  updateAssistantCapabilitiesController,
  updateFunctionalityCapabilitiesController,
} from "../controllers/assistant-capabilities-controller.js";
import { authenticate } from "../middleware/auth-middleware.js";
import { authorize } from "../middleware/authorize.js";

const router = Router();

router.use(authenticate, authorize("SUPER_ADMIN"));

router.get("/:planKey", getAssistantCapabilitiesController);
router.put("/:planKey", updateAssistantCapabilitiesController);
router.put("/:planKey/:functionalityKey", updateFunctionalityCapabilitiesController);
router.delete("/:planKey", deletePlanCapabilitiesController);

export default router;