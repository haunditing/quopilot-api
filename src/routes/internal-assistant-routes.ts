import { Router } from "express";
import {
  listInternalAssistantMessagesController,
  resetInternalAssistantController,
  sendInternalAssistantMessageController,
} from "../controllers/internal-assistant-controller.js";
import { authenticate } from "../middleware/auth-middleware.js";
import { authorize } from "../middleware/authorize.js";
import { requireTenant } from "../middleware/tenant-middleware.js";
import "../services/internal-tenant-assistant.js";

const router = Router();

router.use(authenticate, authorize("TENANT_ADMIN"), requireTenant);

router.get(
  "/messages",
  listInternalAssistantMessagesController,
);

router.post(
  "/messages",
  sendInternalAssistantMessageController,
);

router.post(
  "/reset",
  resetInternalAssistantController,
);

export default router;