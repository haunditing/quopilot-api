import { AgentEvent } from "../models/AgentEvent.js";
import { ConversationState } from "../models/ConversationState.js";
import { Message } from "../models/Message.js";
import type { AgentChatMessage, AgentLLMService } from "./llm-service.js";

const SUMMARY_SYSTEM_PROMPT =
  "Eres un compresor de conversaciones comerciales. Resume la conversación en un " +
  "máximo de 500 palabras, manteniendo: el cliente, los productos mencionados, precios, " +
  "cotizaciones, decisiones pendientes y cualquier compromiso. Responde solo con el resumen.";

export async function getRecentMessages(
  tenantId: string,
  conversationId: string,
  window: number,
): Promise<AgentChatMessage[]> {
  const messages = await Message.find({
    tenantId,
    conversationId,
  })
    .sort({
      createdAt: -1,
    })
    .limit(window)
    .lean();

  return messages
    .filter((message) => message.senderType !== "SYSTEM")
    .reverse()
    .map((message) => ({
      role: message.direction === "INBOUND" ? "user" : "assistant",
      content: message.content,
    }));
}

interface RefreshSummaryInput {
  tenantId: string;
  conversationId: string;
  llmService: AgentLLMService;
  canSummarize: boolean;
  summarizeThreshold: number;
}

export async function refreshSummaryIfNeeded(
  input: RefreshSummaryInput,
): Promise<void> {
  const {
    tenantId,
    conversationId,
    llmService,
    canSummarize,
    summarizeThreshold,
  } = input;

  if (!canSummarize) {
    return;
  }

  const state = await ConversationState.findOne({
    tenantId,
    conversationId,
  }).lean();

  if (!state || state.messageCount < summarizeThreshold) {
    return;
  }

  if (state.messageCount % Math.floor(summarizeThreshold / 2) !== 0) {
    return;
  }

  const recent = await getRecentMessages(
    tenantId,
    conversationId,
    summarizeThreshold,
  );

  const result = await llmService.complete([
    {
      role: "system",
      content: SUMMARY_SYSTEM_PROMPT,
    },
    ...recent,
  ]);

  const summary = result.content.trim();

  if (!summary) {
    return;
  }

  await ConversationState.updateOne(
    {
      tenantId,
      conversationId,
    },
    {
      $set: {
        summary,
      },
    },
  );

  await AgentEvent.create({
    tenantId,
    conversationId,
    type: "SUMMARY_REFRESHED",
  });
}

export async function getConversationSummary(
  tenantId: string,
  conversationId: string,
): Promise<string> {
  const state = await ConversationState.findOne({
    tenantId,
    conversationId,
  }).lean();

  return state?.summary ?? "";
}
