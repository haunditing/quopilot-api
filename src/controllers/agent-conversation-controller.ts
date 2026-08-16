import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth-middleware.js";
import { Agent } from "../models/Agent.js";
import { openConversationSchema, sendMessageSchema } from "../schemas/agent-conversation-schema.js";
import {
  listConversations,
  listMessages,
  openConversation,
} from "../services/agent-conversation-service.js";
import { processInboundMessage } from "../services/agent-runtime-service.js";

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

  if (
    message === "Invalid tenantId" ||
    message === "Invalid conversationId" ||
    message === "Invalid customerId" ||
    message === "Agent not configured"
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

function getTenantId(req: AuthenticatedRequest): string | null {
  return req.user?.tenantId ?? null;
}

export async function openConversationController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = getTenantId(req);

  if (!tenantId) {
    res.status(403).json({
      message: "Tenant context required",
    });

    return;
  }

  const result = openConversationSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid conversation data",
      errors: result.error.flatten(),
    });

    return;
  }

  try {
    const agent = await Agent.findOne({
      tenantId,
      status: "ACTIVE",
    }).lean();

    const conversation = await openConversation({
      tenantId,
      customerId: result.data.customerId,
      channel: result.data.channel,
      agentId: agent?._id.toString(),
    });

    res.status(201).json(conversation);
  } catch (error) {
    handleConversationError(res, error, "Unable to open conversation");
  }
}

export async function listConversationsController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = getTenantId(req);

  if (!tenantId) {
    res.status(403).json({
      message: "Tenant context required",
    });

    return;
  }

  const page = Math.max(1, Number(req.query.page ?? 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20) || 20));
  const status =
    req.query.status === "OPEN" || req.query.status === "CLOSED"
      ? req.query.status
      : undefined;

  try {
    const result = await listConversations({
      tenantId,
      page,
      limit,
      status,
    });

    res.status(200).json(result);
  } catch (error) {
    handleConversationError(res, error, "Unable to list conversations");
  }
}

export async function listMessagesController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = getTenantId(req);

  if (!tenantId) {
    res.status(403).json({
      message: "Tenant context required",
    });

    return;
  }

  const conversationId = String(req.params.conversationId ?? "");
  const limit = Math.min(
    200,
    Math.max(1, Number(req.query.limit ?? 50) || 50),
  );

  try {
    const messages = await listMessages(tenantId, conversationId, limit);

    res.status(200).json(messages);
  } catch (error) {
    handleConversationError(res, error, "Unable to list messages");
  }
}

export async function sendMessageController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = getTenantId(req);

  if (!tenantId) {
    res.status(403).json({
      message: "Tenant context required",
    });

    return;
  }

  const conversationId = String(req.params.conversationId ?? "");

  const result = sendMessageSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid message",
      errors: result.error.flatten(),
    });

    return;
  }

  try {
    const outcome = await processInboundMessage({
      tenantId,
      conversationId,
      content: result.data.content,
    });

    res.status(200).json(outcome);
  } catch (error) {
    handleConversationError(res, error, "Unable to process message");
  }
}
