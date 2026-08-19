import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth-middleware.js";
import {
  getSupportMessages,
  processSupportMessage,
  resetSupportConversation,
  getSupportMetrics,
} from "../services/support-assistant-engine.js";
import {
  getSupportAssistantConfig,
  updateSupportAssistantConfig,
} from "../services/support-assistant-config-service.js";
import {
  createKnowledgeDoc,
  deleteKnowledgeDoc,
  listKnowledgeDocs,
  updateKnowledgeDoc,
} from "../services/support-knowledge-service.js";
import {
  confirmSupportCase,
  createSupportCase,
  deleteSupportCase,
  listSupportCases,
  updateSupportCase,
} from "../services/support-case-service.js";
import {
  createKnowledgeDocSchema,
  createSupportCaseSchema,
  sendSupportMessageSchema,
  updateKnowledgeDocSchema,
  updateSupportAssistantConfigSchema,
  updateSupportCaseSchema,
} from "../schemas/support-assistant-schema.js";

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

function requireUserId(req: AuthenticatedRequest, res: Response): string | null {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({
      message: "User context required",
    });

    return null;
  }

  return userId;
}

export async function listSupportMessagesController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantContext(req, res);

  if (!tenantId) {
    return;
  }

  const userId = requireUserId(req, res);

  if (!userId) {
    return;
  }

  try {
    const result = await getSupportMessages(tenantId, userId);

    res.status(200).json(result.messages);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Unable to load support assistant messages",
    });
  }
}

export async function sendSupportMessageController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantContext(req, res);

  if (!tenantId) {
    return;
  }

  const userId = requireUserId(req, res);

  if (!userId) {
    return;
  }

  const result = sendSupportMessageSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid support message",
      errors: result.error.flatten(),
    });

    return;
  }

  try {
    const { reply, conversationId, meta } = await processSupportMessage({
      tenantId,
      userId,
      content: result.data.content,
    });

    res.status(200).json({
      conversationId,
      reply,
      meta,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Unable to process support assistant message",
    });
  }
}

export async function resetSupportConversationController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantContext(req, res);

  if (!tenantId) {
    return;
  }

  const userId = requireUserId(req, res);

  if (!userId) {
    return;
  }

  try {
    await resetSupportConversation(tenantId, userId);

    res.status(200).json({
      ok: true,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Unable to reset support conversation",
    });
  }
}

export async function getSupportMetricsController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantContext(req, res);

  if (!tenantId) {
    return;
  }

  try {
    const metrics = await getSupportMetrics(tenantId);

    res.status(200).json(metrics);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Unable to load support metrics",
    });
  }
}

export async function getSupportConfigController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantContext(req, res);

  if (!tenantId) {
    return;
  }

  try {
    const config = await getSupportAssistantConfig(tenantId);

    res.status(200).json({
      status: config.status,
      llm: {
        provider: config.llm?.provider ?? "",
        model: config.llm?.model ?? "",
        baseUrl: config.llm?.baseUrl ?? "",
        maxTokens: config.llm?.maxTokens ?? 1024,
        timeoutMs: config.llm?.timeoutMs ?? 30000,
        hasApiKey: Boolean(config.llm?.apiKey),
      },
      systemPrompt: config.systemPrompt ?? "",
      caseThreshold: config.caseThreshold,
      ragMaxDocs: config.ragMaxDocs,
      ragMinScore: config.ragMinScore,
      memoryWindow: config.memoryWindow,
      maxContextTokens: config.maxContextTokens,
      agentTools: config.agentTools ?? [],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Unable to load support assistant config",
    });
  }
}

export async function updateSupportConfigController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantContext(req, res);

  if (!tenantId) {
    return;
  }

  const result = updateSupportAssistantConfigSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid support config",
      errors: result.error.flatten(),
    });

    return;
  }

  try {
    await updateSupportAssistantConfig(tenantId, result.data);

    res.status(200).json({
      ok: true,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Unable to update support assistant config",
    });
  }
}

export async function listKnowledgeDocsController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantContext(req, res);

  if (!tenantId) {
    return;
  }

  try {
    const docs = await listKnowledgeDocs(tenantId);

    res.status(200).json(docs);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Unable to load knowledge base",
    });
  }
}

export async function createKnowledgeDocController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantContext(req, res);

  if (!tenantId) {
    return;
  }

  const result = createKnowledgeDocSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid knowledge doc",
      errors: result.error.flatten(),
    });

    return;
  }

  try {
    const doc = await createKnowledgeDoc(tenantId, result.data);

    res.status(201).json(doc);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Unable to create knowledge doc",
    });
  }
}

export async function updateKnowledgeDocController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantContext(req, res);

  if (!tenantId) {
    return;
  }

  const docId = req.params.docId;

  if (typeof docId !== "string") {
    res.status(400).json({ message: "Invalid docId" });
    return;
  }

  const result = updateKnowledgeDocSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid knowledge doc",
      errors: result.error.flatten(),
    });

    return;
  }

  try {
    const doc = await updateKnowledgeDoc(tenantId, docId, result.data);

    res.status(200).json(doc);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Unable to update knowledge doc",
    });
  }
}

export async function deleteKnowledgeDocController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantContext(req, res);

  if (!tenantId) {
    return;
  }

  const docId = req.params.docId;

  if (typeof docId !== "string") {
    res.status(400).json({ message: "Invalid docId" });
    return;
  }

  try {
    const result = await deleteKnowledgeDoc(tenantId, docId);

    res.status(200).json(result);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Unable to delete knowledge doc",
    });
  }
}

export async function listSupportCasesController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantContext(req, res);

  if (!tenantId) {
    return;
  }

  try {
    const cases = await listSupportCases(tenantId);

    res.status(200).json(cases);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Unable to load support cases",
    });
  }
}

export async function createSupportCaseController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantContext(req, res);

  if (!tenantId) {
    return;
  }

  const result = createSupportCaseSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid support case",
      errors: result.error.flatten(),
    });

    return;
  }

  try {
    const caseDoc = await createSupportCase(tenantId, result.data);

    res.status(201).json(caseDoc);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Unable to create support case",
    });
  }
}

export async function updateSupportCaseController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantContext(req, res);

  if (!tenantId) {
    return;
  }

  const caseId = req.params.caseId;

  if (typeof caseId !== "string") {
    res.status(400).json({ message: "Invalid caseId" });
    return;
  }

  const result = updateSupportCaseSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid support case",
      errors: result.error.flatten(),
    });

    return;
  }

  try {
    const caseDoc = await updateSupportCase(tenantId, caseId, result.data);

    res.status(200).json(caseDoc);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message:
        error instanceof Error ? error.message : "Unable to update support case",
    });
  }
}

export async function confirmSupportCaseController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantContext(req, res);

  if (!tenantId) {
    return;
  }

  const caseId = req.params.caseId;

  if (typeof caseId !== "string") {
    res.status(400).json({ message: "Invalid caseId" });
    return;
  }

  try {
    const caseDoc = await confirmSupportCase(tenantId, caseId);

    res.status(200).json(caseDoc);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message:
        error instanceof Error ? error.message : "Unable to confirm support case",
    });
  }
}

export async function deleteSupportCaseController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = requireTenantContext(req, res);

  if (!tenantId) {
    return;
  }

  const caseId = req.params.caseId;

  if (typeof caseId !== "string") {
    res.status(400).json({ message: "Invalid caseId" });
    return;
  }

  try {
    const result = await deleteSupportCase(tenantId, caseId);

    res.status(200).json(result);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message:
        error instanceof Error ? error.message : "Unable to delete support case",
    });
  }
}