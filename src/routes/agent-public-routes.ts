import { Router } from "express";
import {
  listPublicMessagesController,
  sendPublicMessageController,
  startPublicChatController,
  getPublicChatConfigController,
  getPublicTypingController,
  setPublicTypingController,
  closePublicChatController,
} from "../controllers/agent-public-controller.js";
import {
  publicChatReadLimiter,
  publicChatSendLimiter,
  publicChatStartLimiter,
  publicChatTypingLimiter,
} from "../config/rate-limit.js";

const router = Router();

router.get(
  "/chat/:tenantId/config",
  publicChatReadLimiter,
  getPublicChatConfigController,
);

router.post("/chat/:tenantId", publicChatStartLimiter, startPublicChatController);

router.get(
  "/chat/:tenantId/conversations/:conversationId/messages",
  publicChatReadLimiter,
  listPublicMessagesController,
);

router.post(
  "/chat/:tenantId/conversations/:conversationId/messages",
  publicChatSendLimiter,
  sendPublicMessageController,
);

router.get(
  "/chat/:tenantId/conversations/:conversationId/typing",
  publicChatReadLimiter,
  getPublicTypingController,
);

router.post(
  "/chat/:tenantId/conversations/:conversationId/typing",
  publicChatTypingLimiter,
  setPublicTypingController,
);

router.post(
  "/chat/:tenantId/conversations/:conversationId/close",
  publicChatSendLimiter,
  closePublicChatController,
);

export default router;
