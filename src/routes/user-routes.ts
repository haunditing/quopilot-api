import { Router } from "express";
import { authorize } from "../middleware/authorize.js";
import { authenticate } from "../middleware/auth-middleware.js";
import { requireTenant } from "../middleware/tenant-middleware.js";
import { requireUsageLimit } from "../services/usage-limit-service.js";
import {
  createAgentController,
  deleteUserController,
  getUserController,
  getUsersController,
  updateUserController,
  updateUserStatusController,
} from "../controllers/user-controller.js";

const router = Router();

router.use(authenticate, authorize("TENANT_ADMIN"), requireTenant);

router.get("/", getUsersController);

router.post("/", requireUsageLimit("agents.maxActive"), createAgentController);

router.get("/:userId", getUserController);

router.patch("/:userId", updateUserController);

router.patch("/:userId/status", updateUserStatusController);

router.delete("/:userId", deleteUserController);

export default router;
