import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth-middleware.js";
import {
  startPublicChatSchema,
  sendPublicMessageSchema,
  setPublicTypingSchema,
} from "../schemas/agent-public-schema.js";
import {
  closePublicChat,
  getPublicChatConfig,
  getPublicMessages,
  getPublicTyping,
  sendPublicMessage,
  setPublicTyping,
  startPublicChat,
} from "../services/agent-public-service.js";
import {
  verifyPublicChatToken,
  type PublicChatTokenPayload,
} from "../utils/public-chat-token.js";

function handlePublicError(
  res: Response,
  error: unknown,
  fallbackMessage: string,
): void {
  const message = error instanceof Error ? error.message : fallbackMessage;

  if (message === "Tenant not found" || message === "Invalid tenantId") {
    res.status(404).json({
      message: message === "Tenant not found" ? message : "Invalid request",
    });

    return;
  }

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

  if (message === "No web chat channel configured") {
    res.status(404).json({
      message,
    });

    return;
  }

  if (message === "Agent not configured") {
    res.status(400).json({
      message,
    });

    return;
  }

  if (message === "Message is empty") {
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

function readChatToken(req: AuthenticatedRequest): string | null {
  const header = req.header("x-chat-token");

  if (header) {
    return header;
  }

  const raw = req.query.token;

  return typeof raw === "string" && raw ? raw : null;
}

function verifyChatToken(
  req: AuthenticatedRequest,
  res: Response,
): PublicChatTokenPayload | null {
  const token = readChatToken(req);

  if (!token) {
    res.status(401).json({
      message: "Chat token required",
    });

    return null;
  }

  try {
    const payload = verifyPublicChatToken(token);

    if (payload.scope !== "public-chat") {
      throw new Error("Invalid token scope");
    }

    return payload;
  } catch {
    res.status(401).json({
      message: "Invalid or expired chat token",
    });

    return null;
  }
}

function authorizeChatAccess(
  req: AuthenticatedRequest,
  res: Response,
): PublicChatTokenPayload | null {
  const tenantId = String(req.params.tenantId ?? "");
  const conversationId = String(req.params.conversationId ?? "");

  const payload = verifyChatToken(req, res);

  if (!payload) {
    return null;
  }

  if (
    payload.tenantId !== tenantId ||
    payload.conversationId !== conversationId
  ) {
    res.status(403).json({
      message: "Chat token does not match conversation",
    });

    return null;
  }

  return payload;
}

export async function getPublicChatConfigController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = String(req.params.tenantId ?? "");

  try {
    const config = await getPublicChatConfig(tenantId);

    res.status(200).json(config);
  } catch (error) {
    handlePublicError(res, error, "Unable to load chat config");
  }
}

export async function startPublicChatController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = String(req.params.tenantId ?? "");

  const result = startPublicChatSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid chat data",
      errors: result.error.flatten(),
    });

    return;
  }

  try {
    const chat = await startPublicChat({
      tenantId,
      ...result.data,
    });

    res.status(201).json(chat);
  } catch (error) {
    handlePublicError(res, error, "Unable to start chat");
  }
}

export async function listPublicMessagesController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = String(req.params.tenantId ?? "");
  const conversationId = String(req.params.conversationId ?? "");

  const payload = authorizeChatAccess(req, res);

  if (!payload) {
    return;
  }

  try {
    const messages = await getPublicMessages({
      tenantId,
      conversationId,
      customerId: payload.customerId,
    });

    res.status(200).json(messages);
  } catch (error) {
    handlePublicError(res, error, "Unable to load messages");
  }
}

export async function sendPublicMessageController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = String(req.params.tenantId ?? "");
  const conversationId = String(req.params.conversationId ?? "");

  const payload = authorizeChatAccess(req, res);

  if (!payload) {
    return;
  }

  const result = sendPublicMessageSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid message",
      errors: result.error.flatten(),
    });

    return;
  }

  try {
    const outcome = await sendPublicMessage({
      tenantId,
      conversationId,
      customerId: payload.customerId,
      content: result.data.content,
    });

    res.status(200).json(outcome);
  } catch (error) {
    handlePublicError(res, error, "Unable to send message");
  }
}

export async function getPublicTypingController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = String(req.params.tenantId ?? "");
  const conversationId = String(req.params.conversationId ?? "");

  const payload = authorizeChatAccess(req, res);

  if (!payload) {
    return;
  }

  try {
    const typing = await getPublicTyping({
      tenantId,
      conversationId,
    });

    res.status(200).json(typing);
  } catch (error) {
    handlePublicError(res, error, "Unable to load typing status");
  }
}

export async function setPublicTypingController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = String(req.params.tenantId ?? "");
  const conversationId = String(req.params.conversationId ?? "");

  const payload = authorizeChatAccess(req, res);

  if (!payload) {
    return;
  }

  const result = setPublicTypingSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid typing data",
      errors: result.error.flatten(),
    });

    return;
  }

  try {
    await setPublicTyping({
      tenantId,
      conversationId,
      isTyping: result.data.isTyping,
    });

    res.status(204).end();
  } catch (error) {
    handlePublicError(res, error, "Unable to update typing status");
  }
}

export async function closePublicChatController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = String(req.params.tenantId ?? "");
  const conversationId = String(req.params.conversationId ?? "");

  const payload = authorizeChatAccess(req, res);

  if (!payload) {
    return;
  }

  try {
    const conversation = await closePublicChat({
      tenantId,
      conversationId,
    });

    res.status(200).json(conversation);
  } catch (error) {
    handlePublicError(res, error, "Unable to close chat");
  }
}
