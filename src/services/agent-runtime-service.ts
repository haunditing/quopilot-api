import { Agent } from "../models/Agent.js";
import { AgentEvent } from "../models/AgentEvent.js";
import { ConversationState } from "../models/ConversationState.js";
import { provisionAgent } from "./agent-service.js";
import {
  addMessage,
  getConversation,
  hasAvailableHumanAgents,
  NO_AGENTS_REPLY,
} from "./agent-conversation-service.js";
import {
  createLLMService,
  type AgentChatMessage,
} from "./llm-service.js";
import { refreshSummaryIfNeeded } from "./agent-memory-service.js";
import {
  executeTool,
  getEnabledToolDefinitions,
  type AgentToolContext,
} from "./agent-tools/index.js";
import { buildAgentContext } from "./context-builder/context-builder-service.js";
import type { AgentContextProfile } from "./context-builder/types.js";
import env from "../config/env.js";

interface ProcessInboundMessageInput {
  tenantId: string;
  conversationId: string;
  content: string;
  externalMessageId?: string;
}

const INACTIVE_REPLY =
  "Gracias por escribirnos. Nuestro asistente está en mantenimiento, " +
  "pero un asesor humano te atenderá pronto.";

const ERROR_REPLY =
  "Lo siento, estoy teniendo problemas para responder en este momento. " +
  "Por favor, intenta nuevamente en unos minutos.";

function parseToolArguments(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw || "{}");

    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {
      _parseError: raw,
    };
  }
}

async function requestHandoff(
  ctx: AgentToolContext,
  reason?: string,
): Promise<string> {
  const result = await executeTool(ctx, "requestHumanHandoff", {
    reason,
  });

  if (result.ok) {
    const data = result.data as { message?: string };

    return data.message ?? "Un asesor humano te contactará pronto.";
  }

  return "Un asesor humano te contactará pronto.";
}

export async function processInboundMessage(
  input: ProcessInboundMessageInput,
): Promise<{
  reply: string;
  conversationId: string;
  status: "OPEN" | "CLOSED";
}> {
  const { tenantId, conversationId, content, externalMessageId } = input;

  const conversation = await getConversation(tenantId, conversationId);

  if (conversation.status !== "OPEN") {
    throw new Error("Conversation is closed");
  }

  await addMessage({
    tenantId,
    conversationId,
    customerId: conversation.customerId.toString(),
    direction: "INBOUND",
    senderType: "CUSTOMER",
    content,
    status: "RECEIVED",
    externalMessageId,
  });

  await AgentEvent.create({
    tenantId,
    conversationId,
    customerId: conversation.customerId,
    type: "MESSAGE_RECEIVED",
  });

  const state = await ConversationState.findOne({
    tenantId,
    conversationId,
  }).lean();

  if (state?.context?.pendingAction === "HANDOFF") {
    return {
      reply: "",
      conversationId,
      status: "OPEN",
    };
  }

  let agent = await Agent.findOne({
    tenantId,
  }).lean();

  if (!agent) {
    await provisionAgent(tenantId);

    agent = await Agent.findOne({
      tenantId,
    }).lean();

    if (!agent) {
      throw new Error("Agent not configured");
    }
  }

  const ctx: AgentToolContext = {
    tenantId,
    conversationId,
    customerId: conversation.customerId.toString(),
    agent,
  };

  if (agent.status === "INACTIVE") {
    const inactiveReply = (await hasAvailableHumanAgents(tenantId))
      ? INACTIVE_REPLY
      : NO_AGENTS_REPLY;

    await addMessage({
      tenantId,
      conversationId,
      customerId: conversation.customerId.toString(),
      direction: "OUTBOUND",
      senderType: "AI",
      content: inactiveReply,
    });

    return {
      reply: inactiveReply,
      conversationId,
      status: "OPEN",
    };
  }

  const tools = getEnabledToolDefinitions(agent);

  let reply = "";
  let iterations = 0;

  try {
    const escalation = agent.escalation;

    if (
      escalation?.enabled &&
      escalation.keywords?.some((keyword) =>
        content.toLowerCase().includes(keyword.toLowerCase()),
      )
    ) {
      reply = await requestHandoff(
        ctx,
        `El mensaje coincidió con una palabra clave de escalación: ${content}`,
      );
    } else {
      const profile: AgentContextProfile = {
        ...agent,
        allowedProductIds: agent.allowedProductIds?.map((id) =>
          id.toString(),
        ),
      };

      const context = await buildAgentContext({
        tenantId,
        conversationId,
        customerId: conversation.customerId.toString(),
        userMessage: content,
        agent: profile,
      });

      let messages: AgentChatMessage[] = [
        {
          role: "system",
          content: context.systemPrompt,
        },
        ...context.recentMessages,
      ];

      const llm = createLLMService(agent.llm ?? {});

      while (iterations < env.agentMaxToolIterations) {
        const result = await llm.complete(messages, tools);

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
          const toolResult = await executeTool(
            ctx,
            toolCall.name,
            parseToolArguments(toolCall.arguments),
          );

          messages.push({
            role: "tool",
            content: JSON.stringify(toolResult),
            toolCallId: toolCall.id,
          });
        }

        iterations += 1;
      }

      if (!reply.trim()) {
        reply = ERROR_REPLY;
      }
    }
  } catch (error) {
    console.error("[agent-runtime] LLM error:", error);

    await AgentEvent.create({
      tenantId,
      conversationId,
      customerId: conversation.customerId,
      type: "LLM_ERROR",
      data: {
        message: error instanceof Error ? error.message : "Unknown LLM error",
      },
    });

    if (agent.escalation?.enabled) {
      reply = await requestHandoff(
        ctx,
        "El asistente no pudo responder por un error técnico. Se asigna a un asesor humano.",
      );
    } else {
      reply = ERROR_REPLY;
    }
  }

  const replyContent = reply.trim();

  await addMessage({
    tenantId,
    conversationId,
    customerId: conversation.customerId.toString(),
    direction: "OUTBOUND",
    senderType: "AI",
    content: replyContent,
  });

  await AgentEvent.create({
    tenantId,
    conversationId,
    customerId: conversation.customerId,
    type: "MESSAGE_SENT",
  });

  await refreshSummaryIfNeeded({
    tenantId,
    conversationId,
    llmService: createLLMService(agent.llm ?? {}),
    canSummarize: Boolean(agent.llm?.apiKey),
    summarizeThreshold: agent.memory?.messageWindow ?? env.agentMemoryWindow,
  });

  const updated = await getConversation(tenantId, conversationId);

  return {
    reply: replyContent,
    conversationId,
    status: updated.status,
  };
}
