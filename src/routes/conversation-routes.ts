import { Router } from "express";
import {
  getConversationMessagesController,
  getConversationTypingController,
  listConversationsController,
  replyToConversationController,
  setConversationTypingController,
} from "../controllers/conversation-controller.js";
import { authenticate } from "../middleware/auth-middleware.js";
import { authorize } from "../middleware/authorize.js";
import { requireTenant } from "../middleware/tenant-middleware.js";

const router = Router();

router.get(
  "/",
  authenticate,
  requireTenant,
  listConversationsController,
);

router.get(
  "/:conversationId/messages",
  authenticate,
  requireTenant,
  getConversationMessagesController,
);

router.post(
  "/:conversationId/reply",
  authenticate,
  authorize("AGENT"),
  requireTenant,
  replyToConversationController,
);

router.get(
  "/:conversationId/typing",
  authenticate,
  requireTenant,
  getConversationTypingController,
);

router.post(
  "/:conversationId/typing",
  authenticate,
  authorize("AGENT"),
  requireTenant,
  setConversationTypingController,
);

export default router;
