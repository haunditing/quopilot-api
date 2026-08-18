import { AssistantConversation } from "../models/AssistantConversation.js";
import { AssistantMessage } from "../models/AssistantMessage.js";
import {
  createLLMService,
  type AgentChatMessage,
  type AgentLLMService,
  type AgentToolDefinition,
} from "./llm-service.js";
import env from "../config/env.js";

export interface AssistantContext {
  tenantId: string;
  conversationId: string;
}

export interface AssistantToolResult {
  ok: boolean;
  message: string;
  data?: unknown;
}

export interface AssistantTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute(
    ctx: AssistantContext,
    args: Record<string, unknown>,
  ): Promise<AssistantToolResult>;
}

export interface AssistantDefinition {
  id: string;
  name: string;
  description: string;
  systemPrompt(ctx: AssistantContext): string;
  tools: AssistantTool[];
  resolveLLM?(
    ctx: AssistantContext,
  ): AgentLLMService | Promise<AgentLLMService>;
}

const assistantRegistry = new Map<string, AssistantDefinition>();

export function registerAssistant(definition: AssistantDefinition): void {
  assistantRegistry.set(definition.id, definition);
}

export function getAssistant(
  assistantId: string,
): AssistantDefinition | undefined {
  return assistantRegistry.get(assistantId);
}

export function listAssistants(): AssistantDefinition[] {
  return [...assistantRegistry.values()];
}

export async function getOrCreateAssistantConversation(
  tenantId: string,
  assistantId: string,
) {
  const existing = await AssistantConversation.findOne({
    tenantId,
    assistantId,
    status: "OPEN",
  })
    .sort({ createdAt: 1 })
    .lean();

  if (existing) {
    return existing;
  }

  const created = await AssistantConversation.create({
    tenantId,
    assistantId,
  });

  return created.toObject();
}

export async function listAssistantMessages(
  tenantId: string,
  assistantId: string,
) {
  const conversation = await AssistantConversation.findOne({
    tenantId,
    assistantId,
  })
    .sort({ updatedAt: -1 })
    .lean();

  if (!conversation) {
    return [];
  }

  return AssistantMessage.find({
    tenantId,
    conversationId: conversation._id,
  })
    .sort({ createdAt: 1 })
    .lean();
}

export async function closeAssistantConversations(
  tenantId: string,
  assistantId: string,
): Promise<void> {
  await AssistantConversation.updateMany(
    {
      tenantId,
      assistantId,
      status: "OPEN",
    },
    {
      $set: {
        status: "CLOSED",
      },
    },
  );
}

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

function toChatRole(role: string): "system" | "user" | "assistant" {
  if (role === "ASSISTANT") {
    return "assistant";
  }

  if (role === "USER") {
    return "user";
  }

  return "system";
}

export interface ProcessAssistantMessageInput {
  tenantId: string;
  assistantId: string;
  content: string;
}

export async function processAssistantMessage(
  input: ProcessAssistantMessageInput,
): Promise<{
  reply: string;
  conversationId: string;
}> {
  const { tenantId, assistantId, content } = input;

  const definition = getAssistant(assistantId);

  if (!definition) {
    throw new Error("Assistant not found");
  }

  const conversation = await getOrCreateAssistantConversation(
    tenantId,
    assistantId,
  );

  const conversationId = conversation._id.toString();

  const ctx: AssistantContext = {
    tenantId,
    conversationId,
  };

  await AssistantMessage.create({
    tenantId,
    conversationId: conversation._id,
    role: "USER",
    content,
  });

  const llm = definition.resolveLLM
    ? await definition.resolveLLM(ctx)
    : createLLMService();

  const recent = await AssistantMessage.find({
    tenantId,
    conversationId: conversation._id,
  })
    .sort({ createdAt: 1 })
    .limit(env.agentMemoryWindow)
    .lean();

  const messages: AgentChatMessage[] = [
    {
      role: "system",
      content: definition.systemPrompt(ctx),
    },
    ...recent.map((message) => ({
      role: toChatRole(message.role),
      content: message.content,
    })),
  ];

  const tools: AgentToolDefinition[] = definition.tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));

  let reply = "";
  let iterations = 0;

  try {
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
        const tool = definition.tools.find(
          (item) => item.name === toolCall.name,
        );

        let toolResult: AssistantToolResult;

        if (!tool) {
          toolResult = {
            ok: false,
            message: `Herramienta desconocida: ${toolCall.name}`,
          };
        } else {
          try {
            toolResult = await tool.execute(
              ctx,
              parseToolArguments(toolCall.arguments),
            );
          } catch (error) {
            toolResult = {
              ok: false,
              message:
                error instanceof Error
                  ? error.message
                  : "Error ejecutando la herramienta",
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

    if (!reply.trim()) {
      reply = "No pude completar la acción. Intenta reformular tu solicitud.";
    }
  } catch (error) {
    console.error("[assistant-engine] error:", error);

    reply =
      "No hay un proveedor de inteligencia artificial configurado en este momento. Por favor, contacta al administrador de la plataforma para activarlo.";
  }

  const replyContent = reply.trim();

  await AssistantMessage.create({
    tenantId,
    conversationId: conversation._id,
    role: "ASSISTANT",
    content: replyContent,
  });

  await AssistantConversation.updateOne(
    {
      _id: conversation._id,
    },
    {
      $set: {
        lastMessageAt: new Date(),
      },
    },
  );

  return {
    reply: replyContent,
    conversationId,
  };
}
