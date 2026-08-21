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
router.get("/:key", getPlanController);
router.put("/:key", updatePlanController);
router.delete("/:key", deletePlanController);
router.post("/:key/default", setDefaultPlanController);
router.get("/:key/features", getPlanFeaturesController);
router.put("/:key/features", updatePlanFeaturesController);
router.get("/:key/capabilities", getPlanCapabilitiesController);
router.put("/:key/capabilities", updatePlanCapabilitiesController);

export default router;