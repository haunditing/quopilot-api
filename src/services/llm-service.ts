import env from "../config/env.js";

export type AgentChatRole = "system" | "user" | "assistant" | "tool";

export interface AgentChatMessage {
  role: AgentChatRole;
  content: string;
  toolCalls?: AgentToolCall[];
  toolCallId?: string;
}

export interface AgentToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface AgentToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface AgentLLMResult {
  content: string;
  toolCalls: AgentToolCall[];
  finishReason: "stop" | "tool_calls" | "length";
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
  };
}

export interface AgentLLMService {
  complete(
    messages: AgentChatMessage[],
    tools?: AgentToolDefinition[],
  ): Promise<AgentLLMResult>;
}

const PRODUCT_INTENT_PATTERN =
  /producto|precio|cu[aá]nto|cuesta|catalogo|cat[aá]logo|disponible|tienes|sku|venden|valor|cuot[oa]/i;

const SEARCH_STOPWORDS =
  /\b(quiero|busco|necesito|dame|el|la|los|las|un|una|y|o|de|del|a|en|para|por|sobre|puedes|me|tienes|precio)\b/gi;

function cleanSearchTerm(raw: string): string {
  const cleaned = raw
    .replace(
      /(quiero|busco|necesito|dame|muestra|muéstrame|puedes|pasa|sobre|precio de|cu[aá]nto cuesta|cual es|cu[aá]l es|el precio de|me podr[ií]as|informaci[oó]n)/gi,
      " ",
    )
    .replace(SEARCH_STOPWORDS, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || raw.trim();
}

function formatProductList(content: string): string {
  try {
    const result = JSON.parse(content) as {
      data?: Array<{
        name?: string;
        sku?: string;
        unitPrice?: number;
        currency?: string;
      }>;
      message?: string;
    };

    if (!result.data?.length) {
      return result.message ?? "No encontré productos que coincidan con tu búsqueda.";
    }

    const lines = result.data.map(
      (product) =>
        `- ${product.name}${product.sku ? ` (${product.sku})` : ""}: $${product.unitPrice} ${product.currency ?? ""}`,
    );

    return `Encontré estos productos:\n${lines.join("\n")}\n¿Te interesa alguno para prepararte una cotización?`;
  } catch {
    return "Lo siento, no pude consultar los productos en este momento.";
  }
}

class OfflineLLMService implements AgentLLMService {
  async complete(messages: AgentChatMessage[]): Promise<AgentLLMResult> {
    const lastToolMessage = [...messages]
      .reverse()
      .find((message) => message.role === "tool");

    if (lastToolMessage) {
      return {
        content: formatProductList(lastToolMessage.content),
        toolCalls: [],
        finishReason: "stop",
      };
    }

    const lastUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user");

    if (!lastUserMessage) {
      return {
        content: "¿En qué puedo ayudarte?",
        toolCalls: [],
        finishReason: "stop",
      };
    }

    if (PRODUCT_INTENT_PATTERN.test(lastUserMessage.content)) {
      return {
        content: "",
        toolCalls: [
          {
            id: "offline-search",
            name: "searchProducts",
            arguments: JSON.stringify({
              search: cleanSearchTerm(lastUserMessage.content),
            }),
          },
        ],
        finishReason: "tool_calls",
      };
    }

    return {
      content:
        "Gracias por tu mensaje. Actualmente estoy en modo de demostración sin conexión a un modelo de lenguaje: puedes preguntarme por productos o precios para que los consulte.",
      toolCalls: [],
      finishReason: "stop",
    };
  }
}

interface OpenAIResponseMessage {
  content?: string | null;
  tool_calls?: Array<{
    id: string;
    type: string;
    function?: {
      name?: string;
      arguments?: string;
    };
  }>;
}

function serializeMessages(
  messages: AgentChatMessage[],
): Array<Record<string, unknown>> {
  return messages.map((message) => {
    if (message.role === "assistant" && message.toolCalls?.length) {
      return {
        role: "assistant",
        content: message.content,
        tool_calls: message.toolCalls.map((toolCall) => ({
          id: toolCall.id,
          type: "function",
          function: {
            name: toolCall.name,
            arguments: toolCall.arguments,
          },
        })),
      };
    }

    if (message.role === "tool") {
      return {
        role: "tool",
        content: message.content,
        tool_call_id: message.toolCallId,
      };
    }

    return {
      role: message.role,
      content: message.content,
    };
  });
}

interface OpenAIResponse {
  choices?: Array<{
    message?: OpenAIResponseMessage;
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  error?: {
    message?: string;
  };
}

class OpenAILLMService implements AgentLLMService {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly baseUrl: string,
    private readonly maxTokens: number,
    private readonly timeoutMs: number,
  ) {}

  async complete(
    messages: AgentChatMessage[],
    tools?: AgentToolDefinition[],
  ): Promise<AgentLLMResult> {
    const controller = new AbortController();

    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(
        `${this.baseUrl.replace(/\/$/, "")}/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            messages: serializeMessages(messages),
            tools: tools?.map((tool) => ({
              type: "function",
              function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters,
              },
            })),
            max_tokens: this.maxTokens,
          }),
          signal: controller.signal,
        },
      );

      const body = (await response.json()) as OpenAIResponse;

      if (!response.ok) {
        throw new Error(body.error?.message ?? `LLM request failed: ${response.status}`);
      }

      const choice = body.choices?.[0];

      if (!choice) {
        throw new Error("LLM returned no choices");
      }

      const message = choice.message;

      return {
        content: message?.content ?? "",
        toolCalls: (message?.tool_calls ?? []).map((toolCall) => ({
          id: toolCall.id,
          name: toolCall.function?.name ?? "",
          arguments: toolCall.function?.arguments ?? "{}",
        })),
        finishReason:
          choice.finish_reason === "tool_calls"
            ? "tool_calls"
            : choice.finish_reason === "length"
              ? "length"
              : "stop",
        usage: {
          promptTokens: body.usage?.prompt_tokens,
          completionTokens: body.usage?.completion_tokens,
        },
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export interface LLMServiceConfig {
  provider?: "openai" | "google" | "openrouter" | "custom";
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  maxTokens?: number;
  timeoutMs?: number;
}

function createOpenAILLMService(
  config: Pick<LLMServiceConfig, "apiKey" | "model" | "baseUrl" | "maxTokens" | "timeoutMs">,
): AgentLLMService {
  const apiKey = config.apiKey?.trim();

  if (!apiKey) {
    console.warn(
      "[llm-service] No API key configured for this agent. Using offline demo mode.",
    );

    return new OfflineLLMService();
  }

  return new OpenAILLMService(
    apiKey,
    config.model?.trim() || env.llmModel,
    config.baseUrl?.trim() || env.llmBaseUrl,
    config.maxTokens || env.llmMaxTokens,
    config.timeoutMs || env.llmRequestTimeoutMs,
  );
}

function createGoogleGeminiLLMService(
  config: Pick<LLMServiceConfig, "apiKey" | "model" | "baseUrl" | "maxTokens" | "timeoutMs">,
): AgentLLMService {
  const apiKey = config.apiKey?.trim();

  if (!apiKey) {
    console.warn(
      "[llm-service] No Google API key configured for this agent. Using offline demo mode.",
    );

    return new OfflineLLMService();
  }

  const baseUrl = config.baseUrl?.trim() || "https://generativelanguage.googleapis.com/v1beta/openai/";

  return new OpenAILLMService(
    apiKey,
    config.model?.trim() || env.llmModel,
    baseUrl,
    config.maxTokens || env.llmMaxTokens,
    config.timeoutMs || env.llmRequestTimeoutMs,
  );
}

function createOpenRouterLLMService(
  config: Pick<LLMServiceConfig, "apiKey" | "model" | "baseUrl" | "maxTokens" | "timeoutMs">,
): AgentLLMService {
  const apiKey = config.apiKey?.trim();

  if (!apiKey) {
    console.warn(
      "[llm-service] No OpenRouter API key configured for this agent. Using offline demo mode.",
    );

    return new OfflineLLMService();
  }

  const baseUrl = config.baseUrl?.trim() || "https://openrouter.ai/api/v1";

  return new OpenAILLMService(
    apiKey,
    config.model?.trim() || env.llmModel,
    baseUrl,
    config.maxTokens || env.llmMaxTokens,
    config.timeoutMs || env.llmRequestTimeoutMs,
  );
}

export function createLLMService(
  config: LLMServiceConfig = {},
): AgentLLMService {
  console.log("createLLMService called with config:", JSON.stringify(config));

  const provider = config.provider?.trim() || env.llmProvider || "openai";
  console.log(`Determined provider: ${provider}`);

  if (!config.apiKey) {
    console.warn(
      `[llm-service] No API key configured for this agent. Using offline demo mode.`,
    );

    return new OfflineLLMService();
  }

  switch (provider) {
    case "google":
      return createGoogleGeminiLLMService({
        apiKey: config.apiKey,
        model: config.model,
        baseUrl: config.baseUrl,
        maxTokens: config.maxTokens,
        timeoutMs: config.timeoutMs,
      });

    case "openrouter":
      return createOpenRouterLLMService({
        apiKey: config.apiKey,
        model: config.model,
        baseUrl: config.baseUrl,
        maxTokens: config.maxTokens,
        timeoutMs: config.timeoutMs,
      });

    case "openai":
default:
      return createOpenAILLMService({
        apiKey: config.apiKey,
        model: config.model,
        baseUrl: config.baseUrl,
        maxTokens: config.maxTokens,
        timeoutMs: config.timeoutMs,
      });
  }
}
