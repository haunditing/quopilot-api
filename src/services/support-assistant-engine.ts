import { Types } from "mongoose";
import { Tenant } from "../models/Tenant.js";
import env from "../config/env.js";
import { SupportConversation } from "../models/SupportConversation.js";
import { SupportMessage } from "../models/SupportMessage.js";
import { createLLMService } from "./llm-service.js";
import {
  getSupportAssistantConfig,
  SUPPORT_ASSISTANT_ID,
} from "./support-assistant-config-service.js";
import {
  classifyScope,
  moduleLabel,
  routeIntent,
} from "./support-intent-router.js";
import type { SupportModule } from "./support-intent-router.js";
import {
  listSupportCases,
  searchCases,
} from "./support-case-service.js";
import {
  listKnowledgeDocs,
  searchKnowledge,
} from "./support-knowledge-service.js";
import {
  PLATFORM_TOOLS,
  PLATFORM_TOOL_DEFINITIONS,
} from "./support-platform-tools.js";
import { guardResponse } from "./support-response-guard.js";
import {
  getAssistantCapabilities,
  getAllToolPermissions,
  getToolPermissionsForPrompt,
} from "./assistant-capabilities-service.js";

function parseToolArguments(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

const TOOL_TO_ASSISTANT_KEY: Record<string, string> = {
  getTenantSummary: "tools_dashboard",
  getAgentConfig: "tools_agent",
  getSystemStatus: "tools_dashboard",
  getQuotes: "tools_quotes",
  getSales: "tools_sales",
  getProducts: "tools_products",
  getCustomers: "tools_customers",
  getChannels: "tools_channels",
};

async function getTenantPlan(tenantId: string): Promise<string> {
  const tenant = await Tenant.findById(tenantId).select("plan").lean();
  return tenant?.plan ?? "FREE";
}

async function getOrCreateSupportConversation(tenantId: string, userId: string) {
  const conversation = await SupportConversation.findOneAndUpdate(
    {
      tenantId,
      userId,
      assistantId: SUPPORT_ASSISTANT_ID,
      status: "OPEN",
    },
    {
      $setOnInsert: {
        tenantId,
        userId,
        assistantId: SUPPORT_ASSISTANT_ID,
        status: "OPEN",
      },
    },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

  return conversation;
}

function buildSystemPrompt(base: string, context: {
  module?: SupportModule;
  caseBlock?: string;
  docsBlock?: string;
  toolBlock?: string;
  inScope: boolean;
  assistantCapabilities: Array<{
    toolKey: string;
    allowedActions: string[];
    executionLevel: string;
    requiresConfirmation: boolean;
  }>;
  executionLevels: Record<string, string>;
}): string {
  const parts: string[] = [];
  parts.push(base.trim());

  if (!context.inScope) {
    return parts.join("\n");
  }

  if (context.module && context.module !== "unknown") {
    parts.push(
      `\nMódulo identificado: ${moduleLabel(context.module)}. Usa esto para orientar la respuesta, pero no inventes datos.`,
    );
  }

  if (context.caseBlock) {
    parts.push(
      `\nCaso de soporte relevante (fuente primaria):\n${context.caseBlock}`,
    );
  }

  if (context.docsBlock) {
    parts.push(
      `\nDocumentación de la base de conocimiento (fuente de referencia):\n${context.docsBlock}`,
    );
  }

  if (context.toolBlock) {
    parts.push(
      `\nDatos reales del tenant consultados en vivo (no inventes otros):\n${context.toolBlock}`,
    );
  }

  if (context.assistantCapabilities.length > 0) {
    const toolDescriptions = context.assistantCapabilities.map((p) => {
      return `- ${p.toolKey}: ${p.allowedActions.join(", ")} | Nivel: ${p.executionLevel} | Confirm: ${p.requiresConfirmation ? "Sí" : "No"}`;
    }).join("\n");
    parts.push(
      `\n## HERRAMIENTAS DISPONIBLES (Dinámico por Plan)\n${toolDescriptions}\n\n## REGLAS DE EJECUCIÓN:\n1. READ_ONLY: Solo consultar/explicar. NO ejecutes.\n2. ASSISTED_DRAFT: Prepara borrador, pide confirmación.\n3. FULL_AUTOMATION: Ejecuta automáticamente.\n4. Si requiresConfirmation=true, SIEMPRE pide confirmación.`,
    );
  }

  return parts.join("\n");
}

export async function processSupportMessage(input: {
  tenantId: string;
  userId: string;
  content: string;
}) {
  const { tenantId, userId, content } = input;

  const [config, tenantPlan] = await Promise.all([
    getSupportAssistantConfig(),
    getTenantPlan(tenantId),
  ]);

  const assistantCapabilitiesDoc = await getAssistantCapabilities(tenantPlan);

  const conversation = await getOrCreateSupportConversation(tenantId, userId);
  const conversationId = conversation._id.toString();

  await SupportMessage.create({
    tenantId: new Types.ObjectId(tenantId),
    userId: new Types.ObjectId(userId),
    conversationId: conversation._id,
    role: "USER",
    content,
  });

  if (config.status === "INACTIVE") {
    const reply =
      "El asistente de soporte está desactivado por un administrador. Consulta la documentación de QuoPilot o contacta al equipo de desarrollo.";

    await SupportMessage.create({
      tenantId: new Types.ObjectId(tenantId),
      userId: new Types.ObjectId(userId),
      conversationId: conversation._id,
      role: "ASSISTANT",
      content: reply,
    });

    await SupportConversation.updateOne(
      { _id: conversation._id },
      { $set: { lastMessageAt: new Date() } },
    );

    return { reply, conversationId };
  }

  const scope = classifyScope(content);
  const route = routeIntent(content);

  const assistantCapabilities = await getAssistantCapabilities(tenantPlan);
  const toolPermissions = assistantCapabilities.toolPermissions ?? [];

  const allowedTools = Object.entries(PLATFORM_TOOLS)
    .map(([name, fn]) => {
      const toolKey = TOOL_TO_ASSISTANT_KEY[name];
      if (!toolKey) return null;

      const perm = toolPermissions.find((p) => p.toolKey === toolKey);
      if (!perm || perm.allowedActions.length === 0) return null;

      return {
        name,
        enabled: true,
        toolKey,
        executionLevel: perm.executionLevel,
        allowedActions: perm.allowedActions,
        requiresConfirmation: perm.requiresConfirmation,
      };
    })
    .filter((t): t is NonNullable<typeof t> => t !== null);

  const allowedToolNames = new Set(allowedTools.map((t) => t.name));

  const toolResults: Array<{ name: string; data: unknown }> = [];

  if (scope.inScope && route.intent === "query") {
    const toolsToRun: string[] = [];

    if (["platform", "tenants", "dashboard", "quotes", "sales", "products", "customers", "channels"].includes(route.module)) {
      toolsToRun.push("getTenantSummary");
    }
    if (["agent", "configuracion", "settings"].includes(route.module) || /agente|config/.test(content)) {
      toolsToRun.push("getAgentConfig");
    }
    if (["platform", "api", "auth", "system", "status"].includes(route.module)) {
      toolsToRun.push("getSystemStatus");
    }
    if (["quotes", "cotizaciones"].includes(route.module)) {
      toolsToRun.push("getQuotes");
    }
    if (["sales", "ventas"].includes(route.module)) {
      toolsToRun.push("getSales");
    }
    if (["products", "productos", "catalogo"].includes(route.module)) {
      toolsToRun.push("getProducts");
    }
    if (["customers", "clientes"].includes(route.module)) {
      toolsToRun.push("getCustomers");
    }
    if (["channels", "canales"].includes(route.module)) {
      toolsToRun.push("getChannels");
    }

    for (const toolName of toolsToRun) {
      if (!allowedToolNames.has(toolName)) continue;
      const tool = PLATFORM_TOOLS[toolName];
      if (tool) {
        try {
          const result = await tool(tenantId, {});
          if (result.ok) {
            toolResults.push({ name: toolName, data: result.data });
          }
        } catch (error) {
          console.error("[support-assistant] tool error:", error);
        }
      }
    }
  }

  const caseResults =
    scope.inScope && route.intent !== "greeting"
      ? await searchCases(tenantId, content, 1, config.caseThreshold)
      : [];

  const bestCase = caseResults[0] ?? null;

  const docResults =
    scope.inScope &&
    !bestCase &&
    route.intent !== "greeting"
      ? await searchKnowledge(tenantId, content, config.ragMaxDocs, config.ragMinScore)
      : [];

  const caseBlock = bestCase
    ? [
        `Título: ${bestCase.caseDoc.title}`,
        `Problema: ${bestCase.caseDoc.problem}`,
        `Solución verificada: ${bestCase.caseDoc.solution}`,
      ].join("\n")
    : "";

  const docsBlock =
    docResults.length > 0
      ? docResults
          .map(
            (result, index) =>
              `Documento ${index + 1}: ${result.doc.title}\n${result.doc.summary}\n${result.doc.content}`,
          )
          .join("\n\n")
      : "";

  const toolBlock =
    toolResults.length > 0
      ? toolResults
          .map((result) => `Herramienta ${result.name}: ${JSON.stringify(result.data)}`)
          .join("\n")
      : "";

  const llm = createLLMService({
    provider: config.llm?.provider,
    apiKey: config.llm?.apiKey,
    model: config.llm?.model,
    baseUrl: config.llm?.baseUrl,
    maxTokens: config.llm?.maxTokens,
    timeoutMs: config.llm?.timeoutMs,
  });

  const assistantCapabilitiesForPrompt = await getToolPermissionsForPrompt(tenantPlan);
  const executionLevels = await getAllToolPermissions(tenantPlan).then((perms) =>
    perms.reduce((acc, p) => {
      acc[p.toolKey] = p.executionLevel;
      return acc;
    }, {} as Record<string, string>),
  );

  const systemPrompt = buildSystemPrompt(config.systemPrompt ?? "", {
    module: route.module,
    caseBlock,
    docsBlock,
    toolBlock,
    inScope: scope.inScope,
    assistantCapabilities: assistantCapabilities.toolPermissions ?? [],
    executionLevels,
  });

  const recent = await SupportMessage.find({
    tenantId,
    userId,
    conversationId: conversation._id,
  })
    .sort({ createdAt: 1 })
    .limit(config.memoryWindow)
    .lean();

  const messages: Array<{
    role: "system" | "user" | "assistant" | "tool";
    content: string;
    toolCalls?: Array<{ id: string; name: string; arguments: string }>;
    toolCallId?: string;
  }> = [
    { role: "system", content: systemPrompt },
    ...recent.map((message) => ({
      role: (message.role === "USER" ? "user" : "assistant") as "user" | "assistant",
      content: message.content,
    })),
  ];

  const allowedToolsForLLM = PLATFORM_TOOL_DEFINITIONS.filter((tool) =>
    allowedToolNames.has(tool.name),
  ).map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));

  let reply = "";
  let iterations = 0;

  try {
    while (iterations < env.agentMaxToolIterations) {
      const result = await llm.complete(messages, allowedToolsForLLM);

      if (result.toolCalls.length === 0) {
        reply = result.content;
        break;
      }

      messages.push({
        role: "assistant",
        content: result.content,
        toolCalls: result.toolCalls,
      });

      for (const toolCall of result.toolCalls) {
        if (!allowedToolNames.has(toolCall.name)) {
          messages.push({
            role: "tool",
            content: JSON.stringify({
              ok: false,
              message: `Herramienta no disponible para tu plan: ${toolCall.name}`,
            }),
            toolCallId: toolCall.id,
          });
          continue;
        }

        const tool = PLATFORM_TOOLS[toolCall.name];
        let toolResult: { ok: boolean; message: string; data?: unknown };

        if (!tool) {
          toolResult = { ok: false, message: `Herramienta desconocida: ${toolCall.name}` };
        } else {
          try {
            toolResult = await tool(tenantId, parseToolArguments(toolCall.arguments));
          } catch (error) {
            toolResult = {
              ok: false,
              message: error instanceof Error ? error.message : "Error ejecutando la herramienta",
            };
          }
        }

        messages.push({
          role: "tool",
          content: JSON.stringify(toolResult),
          toolCallId: toolCall.id,
        });
      }

      iterations += 1;
    }
  } catch (error) {
    console.error("[support-assistant] llm error:", error);
    reply =
      "No hay un proveedor de inteligencia artificial configurado para el asistente de soporte. Puedes configurarlo desde la pestaña Configuración de esta página.";
  }

  const guarded = guardResponse({
    rawReply: reply.trim(),
    intent: route.intent,
    module: route.module,
    inScope: scope.inScope,
    hasCaseContext: Boolean(bestCase),
    hasDocContext: docResults.length > 0,
    hasToolData: toolResults.length > 0,
  });

  const finalReply = guarded.content;

  await SupportMessage.create({
    tenantId: new Types.ObjectId(tenantId),
    userId: new Types.ObjectId(userId),
    conversationId: conversation._id,
    role: "ASSISTANT",
    content: finalReply,
    meta: {
      intent: route.intent,
      module: route.module,
      grounded: guarded.grounded,
      sources: [
        ...(bestCase ? [bestCase.caseDoc._id] : []),
        ...docResults.map((result) => result.doc._id),
      ],
      caseId: bestCase?.caseDoc._id,
      docIds: docResults.map((result) => result.doc._id),
    },
  });

  await SupportConversation.updateOne(
    { _id: conversation._id },
    { $set: { lastMessageAt: new Date() } },
  );

  return {
    reply: finalReply,
    conversationId,
    meta: {
      intent: route.intent,
      module: route.module,
      grounded: guarded.grounded,
    },
  };
}

export async function getSupportMessages(tenantId: string, userId: string) {
  const conversation = await getOrCreateSupportConversation(tenantId, userId);
  const messages = await SupportMessage.find({
    tenantId,
    userId,
    conversationId: conversation._id,
  })
    .sort({ createdAt: 1 })
    .lean();

  return { conversationId: conversation._id.toString(), messages };
}

export async function resetSupportConversation(tenantId: string, userId: string) {
  const conversation = await getOrCreateSupportConversation(tenantId, userId);
  await SupportMessage.deleteMany({ tenantId, userId, conversationId: conversation._id });
  await SupportConversation.updateOne({ _id: conversation._id }, { $set: { status: "CLOSED" } });
  return { reset: true };
}

export async function getSupportMetrics(tenantId: string) {
  const [openConversations, totalMessages, cases, docs] = await Promise.all([
    SupportConversation.countDocuments({ tenantId, status: "OPEN" }),
    SupportMessage.countDocuments({ tenantId }),
    listSupportCases(tenantId),
    listKnowledgeDocs(tenantId),
  ]);

  return {
    openConversations,
    totalMessages,
    totalCases: cases.length,
    totalDocs: docs.length,
    confirmedCases: cases.filter((item) => item.status === "VERIFIED").length,
  };
}