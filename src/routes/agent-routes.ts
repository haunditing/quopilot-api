import { Router } from "express";
import {
  getAgentConfigController,
  updateAgentConfigController,
} from "../controllers/agent-controller.js";
import {
  listConversationsController,
  listMessagesController,
  openConversationController,
  sendMessageController,
} from "../controllers/agent-conversation-controller.js";
import {
  listAssistantMessagesController,
  resetAssistantController,
  sendAssistantMessageController,
} from "../controllers/assistant-controller.js";
import { authenticate } from "../middleware/auth-middleware.js";
import { authorize } from "../middleware/authorize.js";
import { requireTenant } from "../middleware/tenant-middleware.js";
import { requireCapability } from "../middleware/entitlement-middleware.js";
import "../services/agent-config-assistant.js";

import "../capabilities/agent.js";

const router = Router();

router.get(
  "/config",
  authenticate,
  requireTenant,
  requireCapability("agent.configure"),
  getAgentConfigController,
);

router.patch(
  "/config",
  authenticate,
  authorize("TENANT_ADMIN"),
  requireTenant,
  requireCapability("agent.configure"),
  updateAgentConfigController,
);

router.get(
  "/conversations",
  authenticate,
  authorize("TENANT_ADMIN"),
  requireTenant,
  requireCapability("agent.chat"),
  listConversationsController,
);

router.post(
  "/conversations",
  authenticate,
  authorize("TENANT_ADMIN"),
  requireTenant,
  requireCapability("agent.chat"),
  openConversationController,
);

router.get(
  "/conversations/:conversationId/messages",
  authenticate,
  authorize("TENANT_ADMIN"),
  requireTenant,
  requireCapability("agent.chat"),
  listMessagesController,
);

router.post(
  "/conversations/:conversationId/messages",
  authenticate,
  authorize("TENANT_ADMIN"),
  requireTenant,
  requireCapability("agent.chat"),
  sendMessageController,
);

router.get(
  "/assistant/messages",
  authenticate,
  authorize("TENANT_ADMIN"),
  requireTenant,
  listAssistantMessagesController,
);

router.post(
  "/assistant/messages",
  authenticate,
  authorize("TENANT_ADMIN"),
  requireTenant,
  sendAssistantMessageController,
);

router.post(
  "/assistant/reset",
  authenticate,
  authorize("TENANT_ADMIN"),
  requireTenant,
  resetAssistantController,
);

export default router;
