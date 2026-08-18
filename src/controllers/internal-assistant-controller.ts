import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth-middleware.js";
import {
  closeAssistantConversations,
  listAssistantMessages,
  processAssistantMessage,
} from "../services/assistant-engine.js";
import { INTERNAL_TENANT_ASSISTANT_ID } from "../services/internal-tenant-assistant.js";
import { sendAssistantMessageSchema } from "../schemas/agent-assistant-schema.js";

function requireTenantContext(
  req: AuthenticatedRequest,
  res: Response,
): string | null {
  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    res.status(403).json({
      message: "Tenant context required",
    });

    return null;
  }

  return tenantId;
}

export async function listInternalAssistantMessagesController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantContext(req, res);

  if (!tenantId) {
    return;
  }

  try {
    const messages = await listAssistantMessages(
      tenantId,
      INTERNAL_TENANT_ASSISTANT_ID,
    );

    res.status(200).json(messages);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Unable to load internal assistant messages",
    });
  }
}

export async function sendInternalAssistantMessageController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantContext(req, res);

  if (!tenantId) {
    return;
  }

  const result = sendAssistantMessageSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid assistant message",
      errors: result.error.flatten(),
    });

    return;
  }

  try {
    const { reply, conversationId } = await processAssistantMessage({
      tenantId,
      assistantId: INTERNAL_TENANT_ASSISTANT_ID,
      content: result.data.content,
    });

    res.status(200).json({
      conversationId,
      reply,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Unable to process internal assistant message",
    });
  }
}

export async function resetInternalAssistantController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantContext(req, res);

  if (!tenantId) {
    return;
  }

  try {
    await closeAssistantConversations(tenantId, INTERNAL_TENANT_ASSISTANT_ID);

    res.status(200).json({
      ok: true,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Unable to reset internal assistant conversation",
    });
  }
}