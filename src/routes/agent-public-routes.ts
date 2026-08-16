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

const router = Router();

router.get("/chat/:tenantId/config", getPublicChatConfigController);

router.post("/chat/:tenantId", startPublicChatController);

router.get(
  "/chat/:tenantId/conversations/:conversationId/messages",
  listPublicMessagesController,
);

router.post(
  "/chat/:tenantId/conversations/:conversationId/messages",
  sendPublicMessageController,
);

router.get(
  "/chat/:tenantId/conversations/:conversationId/typing",
  getPublicTypingController,
);

router.post(
  "/chat/:tenantId/conversations/:conversationId/typing",
  setPublicTypingController,
);

router.post(
  "/chat/:tenantId/conversations/:conversationId/close",
  closePublicChatController,
);

export default router;
