import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth-middleware.js";
import {
  claimConversationForAgent,
  getConversationTyping,
  listConversations,
  listMessages,
  reopenConversation,
  replyToConversation,
  setConversationTyping,
} from "../services/agent-conversation-service.js";

function handleConversationError(
  res: Response,
  error: unknown,
  fallbackMessage: string,
): void {
  const message = error instanceof Error ? error.message : fallbackMessage;

  if (message === "Conversation not found") {
    res.status(404).json({
      message,
    });

    return;
  }

  if (message === "Conversation is closed") {
    res.status(409).json({
      message,
    });

    return;
  }

  if (message === "Conversation is assigned to another agent") {
    res.status(409).json({
      message:
        "Esta conversación fue asignada a otro agente. Ya no puedes responderla.",
    });

    return;
  }

  if (
    message === "Invalid tenantId" ||
    message === "Invalid conversationId" ||
    message === "Invalid channelId"
  ) {
    res.status(400).json({
      message,
    });

    return;
  }

  console.error(error);

  res.status(500).json({
    message: fallbackMessage,
  });
}

export async function listConversationsController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    res.status(403).json({
      message: "Tenant context required",
    });

    return;
  }

  const pageParam = req.query.page;
  const limitParam = req.query.limit;
  const statusParam = req.query.status;
  const channelParam = req.query.channel;
  const channelIdParam = req.query.channelId;

  const page = pageParam === undefined ? 1 : Number(pageParam);
  const limit = limitParam === undefined ? 20 : Number(limitParam);

  if (!Number.isInteger(page) || page < 1) {
    res.status(400).json({
      message: "Invalid page",
    });

    return;
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    res.status(400).json({
      message: "Invalid limit. Must be between 1 and 100",
    });

    return;
  }

  let status: "OPEN" | "CLOSED" | undefined;

  if (statusParam !== undefined) {
    if (statusParam !== "OPEN" && statusParam !== "CLOSED") {
      res.status(400).json({
        message: "Invalid status",
      });

      return;
    }

    status = statusParam;
  }

  let channel: "WHATSAPP" | "WEB_CHAT" | "INSTAGRAM" | undefined;

  if (channelParam !== undefined) {
    if (
      channelParam !== "WHATSAPP" &&
      channelParam !== "WEB_CHAT" &&
      channelParam !== "INSTAGRAM"
    ) {
      res.status(400).json({
        message: "Invalid channel",
      });

      return;
    }

    channel = channelParam;
  }

  const channelId =
    typeof channelIdParam === "string" ? channelIdParam : undefined;

  const userId = req.user?.role === "AGENT" ? req.user.id : undefined;

  try {
    const result = await listConversations({
      tenantId,
      page,
      limit,
      status,
      channel,
      channelId,
      userId,
    });

    res.status(200).json(result);
  } catch (error) {
    handleConversationError(res, error, "Unable to load conversations");
  }
}

export async function getConversationMessagesController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    res.status(403).json({
      message: "Tenant context required",
    });

    return;
  }

  const conversationId = req.params.conversationId;

  if (typeof conversationId !== "string") {
    res.status(400).json({
      message: "Invalid conversationId",
    });

    return;
  }

  const limitParam = req.query.limit;

  const limit = limitParam === undefined ? 100 : Number(limitParam);

  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    res.status(400).json({
      message: "Invalid limit. Must be between 1 and 500",
    });

    return;
  }

  try {
    const messages = await listMessages(tenantId, conversationId, limit);

    res.status(200).json(messages);
  } catch (error) {
    handleConversationError(res, error, "Unable to load messages");
  }
}

export async function replyToConversationController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    res.status(403).json({
      message: "Tenant context required",
    });

    return;
  }

  const conversationId = req.params.conversationId;

  if (typeof conversationId !== "string") {
    res.status(400).json({
      message: "Invalid conversationId",
    });

    return;
  }

  const content = req.body && typeof req.body === "object"
    ? (req.body as { content?: unknown }).content
    : undefined;

  if (typeof content !== "string" || content.trim() === "") {
    res.status(400).json({
      message: "Content is required",
    });

    return;
  }

  try {
    const outcome = await replyToConversation({
      tenantId,
      conversationId,
      content: content.trim(),
      agentUserId: req.user?.id,
    });

    res.status(201).json(outcome);
  } catch (error) {
    handleConversationError(res, error, "Unable to send reply");
  }
}

export async function claimConversationController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = req.user?.tenantId;
  const userId = req.user?.id;

  if (!tenantId || !userId) {
    res.status(403).json({
      message: "Tenant context required",
    });

    return;
  }

  const conversationId = req.params.conversationId;

  if (typeof conversationId !== "string") {
    res.status(400).json({
      message: "Invalid conversationId",
    });

    return;
  }

  try {
    const claimed = await claimConversationForAgent({
      tenantId,
      conversationId,
      userId,
    });

    if (!claimed) {
      res.status(409).json({
        message:
          "La conversación no está disponible. Puede que ya esté asignada o cerrada.",
      });

      return;
    }

    res.status(200).json({
      claimed: true,
    });
  } catch (error) {
    handleConversationError(res, error, "Unable to claim conversation");
  }
}

export async function reopenConversationController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    res.status(403).json({
      message: "Tenant context required",
    });

    return;
  }

  const conversationId = req.params.conversationId;

  if (typeof conversationId !== "string") {
    res.status(400).json({
      message: "Invalid conversationId",
    });

    return;
  }

  try {
    const conversation = await reopenConversation({
      tenantId,
      conversationId,
      reopenedBy: "AGENT",
    });

    res.status(200).json({
      conversation,
    });
  } catch (error) {
    handleConversationError(res, error, "Unable to reopen conversation");
  }
}

export async function getConversationTypingController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    res.status(403).json({
      message: "Tenant context required",
    });

    return;
  }

  const conversationId = req.params.conversationId;

  if (typeof conversationId !== "string") {
    res.status(400).json({
      message: "Invalid conversationId",
    });

    return;
  }

  try {
    const typing = await getConversationTyping(tenantId, conversationId);

    res.status(200).json(typing);
  } catch (error) {
    handleConversationError(res, error, "Unable to load typing status");
  }
}

export async function setConversationTypingController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    res.status(403).json({
      message: "Tenant context required",
    });

    return;
  }

  const conversationId = req.params.conversationId;

  if (typeof conversationId !== "string") {
    res.status(400).json({
      message: "Invalid conversationId",
    });

    return;
  }

  const isTyping = req.body && typeof req.body === "object"
    ? (req.body as { isTyping?: unknown }).isTyping
    : undefined;

  if (typeof isTyping !== "boolean") {
    res.status(400).json({
      message: "Invalid isTyping",
    });

    return;
  }

  try {
    await setConversationTyping({
      tenantId,
      conversationId,
      senderType: "AGENT",
      isTyping,
    });

    res.status(204).end();
  } catch (error) {
    handleConversationError(res, error, "Unable to update typing status");
  }
}
