import { Router } from "express";
import {
  createPlanController,
  deletePlanController,
  getPlanController,
  getPlanCapabilitiesController,
  getPlanFeaturesController,
  listPlansController,
  setDefaultPlanController,
  updatePlanController,
  updatePlanCapabilitiesController,
  updatePlanFeaturesController,
} from "../controllers/plan-controller.js";
import { authenticate } from "../middleware/auth-middleware.js";
import { authorize } from "../middleware/authorize.js";

import "../capabilities/superAdmin.js";

const router = Router();

router.use(authenticate, authorize("SUPER_ADMIN"));

router.get("/", listPlansController);
router.post("/", createPlanController);
router.get("/:id", getPlanController);
router.put("/:id", updatePlanController);
router.patch("/:id", updatePlanController);
router.delete("/:id", deletePlanController);
router.post("/:id/default", setDefaultPlanController);
router.get("/:id/features", getPlanFeaturesController);
router.put("/:id/features", updatePlanFeaturesController);
router.get("/:id/capabilities", getPlanCapabilitiesController);
router.put("/:id/capabilities", updatePlanCapabilitiesController);

export default router;
