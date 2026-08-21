import { Router } from "express";
import {
  claimConversationController,
  getConversationMessagesController,
  getConversationTypingController,
  listConversationsController,
  reopenConversationController,
  replyToConversationController,
  setConversationTypingController,
} from "../controllers/conversation-controller.js";
import { authenticate } from "../middleware/auth-middleware.js";
import { authorize } from "../middleware/authorize.js";
import { requireTenant } from "../middleware/tenant-middleware.js";
import { requireCapability } from "../middleware/entitlement-middleware.js";

import "../capabilities/conversations.js";

const router = Router();

router.get(
  "/",
  authenticate,
  requireTenant,
  requireCapability("conversations.view"),
  listConversationsController,
);

router.get(
  "/:conversationId/messages",
  authenticate,
  requireTenant,
  requireCapability("conversations.messages"),
  getConversationMessagesController,
);

router.post(
  "/:conversationId/reply",
  authenticate,
  authorize("AGENT"),
  requireTenant,
  requireCapability("conversations.reply"),
  replyToConversationController,
);

router.post(
  "/:conversationId/claim",
  authenticate,
  authorize("AGENT"),
  requireTenant,
  requireCapability("conversations.claim"),
  claimConversationController,
);

router.post(
  "/:conversationId/reopen",
  authenticate,
  authorize("AGENT"),
  requireTenant,
  requireCapability("conversations.reopen"),
  reopenConversationController,
);

router.get(
  "/:conversationId/typing",
  authenticate,
  requireTenant,
  requireCapability("conversations.messages"),
  getConversationTypingController,
);

router.post(
  "/:conversationId/typing",
  authenticate,
  authorize("AGENT"),
  requireTenant,
  requireCapability("conversations.reply"),
  setConversationTypingController,
);

export default router;
