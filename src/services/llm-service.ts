import env from "../config/env.js";

export type AgentChatRole = "system" | "user" | "assistant" | "tool";

export type LLMProvider = "openai" | "google" | "openrouter";

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

export interface LLMServiceConfig {
  provider?: LLMProvider | string;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  maxTokens?: number;
  timeoutMs?: number;
}

interface ResolvedLLMConfig {
  provider: LLMProvider;
  apiKey?: string;
  model: string;
  baseUrl: string;
  maxTokens: number;
  timeoutMs: number;
}

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";

const DEFAULT_GOOGLE_BASE_URL = "https://generativelanguage.googleapis.com";

const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

const DEFAULT_GOOGLE_MODEL = "gemini-2.5-flash";

const DEFAULT_OPENROUTER_MODEL = "openai/gpt-4o-mini";

const DEFAULT_MAX_TOKENS = 1024;

const DEFAULT_TIMEOUT_MS = 30000;

/* -------------------------------------------------------------------------- */
/* Product offline demo                                                       */
/* -------------------------------------------------------------------------- */

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
      return (
        result.message ?? "No encontré productos que coincidan con tu búsqueda."
      );
    }

    const lines = result.data.map(
      (product) =>
        `- ${product.name}${product.sku ? ` (${product.sku})` : ""}: $${product.unitPrice} ${product.currency ?? ""}`,
    );

    return `Encontré estos productos:\n${lines.join(
      "\n",
    )}\n¿Te interesa alguno para prepararte una cotización?`;
  } catch {
    return "Lo siento, no pude consultar los productos en este momento.";
  }
}

class OfflineLLMService implements AgentLLMService {
  constructor(private readonly provider: LLMProvider) {}

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
      content: `El proveedor ${this.provider} no tiene una API key configurada. Actualmente estoy en modo de demostración sin conexión a un modelo de lenguaje.`,
      toolCalls: [],
      finishReason: "stop",
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Configuration                                                              */
/* -------------------------------------------------------------------------- */

function getEnvValue(name: string): unknown {
  return (env as unknown as Record<string, unknown>)[name];
}

function getEnvString(name: string): string | undefined {
  const value = getEnvValue(name);

  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getEnvNumber(name: string): number | undefined {
  const value = getEnvValue(name);

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return undefined;
}

function normalizeProvider(provider: string | undefined): LLMProvider {
  const normalized = provider?.trim().toLowerCase();

  switch (normalized) {
    case "google":
    case "gemini":
      return "google";

    case "openai":
      return "openai";

    case "openrouter":
      return "openrouter";

    case undefined:
    case "":
      return "openai";

    default:
      throw new Error(`[llm-service] Unsupported LLM provider: ${provider}`);
  }
}

function getProviderDefaults(provider: LLMProvider): {
  model: string;
  baseUrl: string;
} {
  switch (provider) {
    case "google":
      return {
        model: DEFAULT_GOOGLE_MODEL,
        baseUrl: DEFAULT_GOOGLE_BASE_URL,
      };

    case "openrouter":
      return {
        model: DEFAULT_OPENROUTER_MODEL,
        baseUrl: DEFAULT_OPENROUTER_BASE_URL,
      };

    case "openai":
    default:
      return {
        model: DEFAULT_OPENAI_MODEL,
        baseUrl: DEFAULT_OPENAI_BASE_URL,
      };
  }
}

function resolveProvider(config: LLMServiceConfig): LLMProvider {
  /*
   * Explicit agent provider always wins.
   *
   * Only when the agent does not define a provider do we use
   * env.llmProvider as the global default.
   */
  if (config.provider?.trim()) {
    return normalizeProvider(config.provider);
  }

  return normalizeProvider(getEnvString("llmProvider") ?? "openai");
}

function resolveProviderValue(
  provider: LLMProvider,
  agentValue: string | undefined,
  globalValue: string | undefined,
  globalProvider: LLMProvider,
  providerDefault: string,
): string {
  /*
   * Agent configuration always wins.
   */
  if (agentValue?.trim()) {
    return agentValue.trim();
  }

  /*
   * Global model/baseUrl can only be inherited when the global
   * provider is the same provider selected for this agent.
   *
   * This prevents an OpenAI global model/baseUrl from leaking
   * into a Gemini agent.
   */
  if (globalProvider === provider && globalValue?.trim()) {
    return globalValue.trim();
  }

  return providerDefault;
}

function resolveLLMConfig(config: LLMServiceConfig): ResolvedLLMConfig {
  const provider = resolveProvider(config);

  const globalProvider = normalizeProvider(
    getEnvString("llmProvider") ?? "openai",
  );

  const providerDefaults = getProviderDefaults(provider);

  const apiKey = config.apiKey?.trim() || getEnvString("llmApiKey");

  const model = resolveProviderValue(
    provider,
    config.model,
    getEnvString("llmModel"),
    globalProvider,
    providerDefaults.model,
  );

  const baseUrl = resolveProviderValue(
    provider,
    config.baseUrl,
    getEnvString("llmBaseUrl"),
    globalProvider,
    providerDefaults.baseUrl,
  );

  const maxTokens =
    config.maxTokens ?? getEnvNumber("llmMaxTokens") ?? DEFAULT_MAX_TOKENS;

  const timeoutMs =
    config.timeoutMs ??
    getEnvNumber("llmRequestTimeoutMs") ??
    DEFAULT_TIMEOUT_MS;

  return {
    provider,
    apiKey,
    model,
    baseUrl,
    maxTokens,
    timeoutMs,
  };
}

/* -------------------------------------------------------------------------- */
/* Common OpenAI-compatible implementation                                    */
/* -------------------------------------------------------------------------- */

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

function serializeMessages(
  messages: AgentChatMessage[],
): Array<Record<string, unknown>> {
  return messages.map((message) => {
    if (message.role === "assistant" && message.toolCalls?.length) {
      return {
        role: "assistant",
        content: message.content || null,
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

function serializeTools(
  tools?: AgentToolDefinition[],
): Array<Record<string, unknown>> | undefined {
  if (!tools?.length) {
    return undefined;
  }

  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

class OpenAICompatibleLLMService implements AgentLLMService {
  constructor(
    private readonly provider: "openai" | "openrouter",
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
      const requestBody: Record<string, unknown> = {
        model: this.model,
        messages: serializeMessages(messages),
        max_tokens: this.maxTokens,
      };

      const serializedTools = serializeTools(tools);

      if (serializedTools?.length) {
        requestBody.tools = serializedTools;
      }

      const response = await fetch(
        `${this.baseUrl.replace(/\/$/, "")}/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        },
      );

      const body = (await response.json()) as OpenAIResponse;

      if (!response.ok) {
        throw new Error(
          `[${this.provider}] ${
            body.error?.message ??
            `LLM request failed with status ${response.status}`
          }`,
        );
      }

      const choice = body.choices?.[0];

      if (!choice) {
        throw new Error(`[${this.provider}] LLM returned no choices`);
      }

      const message = choice.message;

      const toolCalls = (message?.tool_calls ?? [])
        .filter((toolCall) => toolCall.function?.name)
        .map((toolCall) => ({
          id: toolCall.id,
          name: toolCall.function?.name ?? "",
          arguments: toolCall.function?.arguments ?? "{}",
        }));

      const finishReason =
        toolCalls.length > 0 || choice.finish_reason === "tool_calls"
          ? "tool_calls"
          : choice.finish_reason === "length"
            ? "length"
            : "stop";

      return {
        content: message?.content ?? "",
        toolCalls,
        finishReason,
        usage: {
          promptTokens: body.usage?.prompt_tokens,
          completionTokens: body.usage?.completion_tokens,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error(
            `[${this.provider}] LLM request timed out after ${this.timeoutMs}ms`,
          );
        }

        throw error;
      }

      throw new Error(`[${this.provider}] Unknown LLM request error`);
    } finally {
      clearTimeout(timeout);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Gemini                                                                     */
/* -------------------------------------------------------------------------- */

function sanitizeGeminiSchema(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeGeminiSchema);
  }

  const record = obj as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    /*
     * Gemini's schema is not a drop-in copy of every JSON Schema keyword.
     * In particular, additionalProperties should not be sent here.
     */
    if (
      key === "additionalProperties" ||
      key === "$schema" ||
      key === "strict"
    ) {
      continue;
    }

    result[key] = sanitizeGeminiSchema(value);
  }

  return result;
}

function serializeGeminiTools(
  tools?: AgentToolDefinition[],
): Array<Record<string, unknown>> | undefined {
  if (!tools?.length) {
    return undefined;
  }

  return [
    {
      functionDeclarations: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: sanitizeGeminiSchema(tool.parameters),
      })),
    },
  ];
}

function parseToolArguments(argumentsValue: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(argumentsValue);

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }

    return {};
  } catch {
    return {};
  }
}

function parseToolResponse(content: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(content);

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }

    return {
      result: parsed,
    };
  } catch {
    return {
      result: content,
    };
  }
}

function findToolNameByCallId(
  messages: AgentChatMessage[],
  toolCallId: string | undefined,
): string | undefined {
  if (!toolCallId) {
    return undefined;
  }

  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];

    if (message.role !== "assistant" || !message.toolCalls?.length) {
      continue;
    }

    const toolCall = message.toolCalls.find(
      (candidate) => candidate.id === toolCallId,
    );

    if (toolCall) {
      return toolCall.name;
    }
  }

  return undefined;
}

function serializeGeminiContents(
  messages: AgentChatMessage[],
): Array<Record<string, unknown>> {
  const contents: Array<Record<string, unknown>> = [];

  for (const message of messages) {
    if (message.role === "system") {
      continue;
    }

    if (message.role === "assistant" && message.toolCalls?.length) {
      contents.push({
        role: "model",
        parts: [
          ...(message.content ? [{ text: message.content }] : []),
          ...message.toolCalls.map((toolCall) => ({
            functionCall: {
              name: toolCall.name,
              args: parseToolArguments(toolCall.arguments),
              ...(toolCall.id ? { id: toolCall.id } : {}),
            },
          })),
        ],
      });

      continue;
    }

    if (message.role === "tool") {
      const functionName = findToolNameByCallId(messages, message.toolCallId);

      if (!functionName) {
        throw new Error(
          `[google] Cannot resolve function name for tool call "${message.toolCallId ?? "unknown"}"`,
        );
      }

      contents.push({
        role: "user",
        parts: [
          {
            functionResponse: {
              name: functionName,
              response: parseToolResponse(message.content),
              ...(message.toolCallId ? { id: message.toolCallId } : {}),
            },
          },
        ],
      });

      continue;
    }

    contents.push({
      role: message.role === "assistant" ? "model" : "user",
      parts: [
        {
          text: message.content,
        },
      ],
    });
  }

  return contents;
}

interface GeminiPart {
  text?: string;
  functionCall?: {
    id?: string;
    name?: string;
    args?: Record<string, unknown>;
  };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      role?: string;
      parts?: GeminiPart[];
    };
    finishReason?: string;
    finishMessage?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
  promptFeedback?: {
    blockReason?: string;
  };
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

class GoogleGeminiLLMService implements AgentLLMService {
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
      const systemMessage = messages.find(
        (message) => message.role === "system",
      );

      const requestBody: Record<string, unknown> = {
        contents: serializeGeminiContents(messages),
        generationConfig: {
          maxOutputTokens: this.maxTokens,
          temperature: 0.7,
          topP: 1,
          topK: 1,
        },
      };

      if (systemMessage?.content) {
        requestBody.systemInstruction = {
          parts: [
            {
              text: systemMessage.content,
            },
          ],
        };
      }

      const geminiTools = serializeGeminiTools(tools);

      if (geminiTools?.length) {
        requestBody.tools = geminiTools;
      }

      const normalizedModel = this.model.startsWith("models/")
        ? this.model.substring("models/".length)
        : this.model;

      const endpoint =
        `${this.baseUrl.replace(/\/$/, "")}` +
        `/v1beta/models/${encodeURIComponent(normalizedModel)}` +
        `:generateContent?key=${encodeURIComponent(this.apiKey)}`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      const body = (await response.json()) as GeminiResponse;

      if (!response.ok) {
        throw new Error(
          `[google] ${
            body.error?.message ??
            `Gemini request failed with status ${response.status}`
          }`,
        );
      }

      if (body.promptFeedback?.blockReason) {
        throw new Error(
          `[google] Gemini blocked the prompt: ${body.promptFeedback.blockReason}`,
        );
      }

      const candidate = body.candidates?.[0];

      if (!candidate) {
        throw new Error("[google] Gemini returned no candidates");
      }

      const parts = candidate.content?.parts ?? [];

      const content = parts
        .filter((part) => typeof part.text === "string")
        .map((part) => part.text)
        .join("");

      const toolCalls = parts
        .filter(
          (
            part,
          ): part is GeminiPart & {
            functionCall: NonNullable<GeminiPart["functionCall"]>;
          } => Boolean(part.functionCall?.name),
        )
        .map((part) => ({
          id: part.functionCall.id ?? `gemini-${part.functionCall.name}`,
          name: part.functionCall.name ?? "",
          arguments: JSON.stringify(part.functionCall.args ?? {}),
        }));

      if (toolCalls.length > 0) {
        return {
          content,
          toolCalls,
          finishReason: "tool_calls",
          usage: {
            promptTokens: body.usageMetadata?.promptTokenCount,
            completionTokens: body.usageMetadata?.candidatesTokenCount,
          },
        };
      }

      switch (candidate.finishReason) {
        case "STOP":
        case undefined:
          return {
            content,
            toolCalls: [],
            finishReason: "stop",
            usage: {
              promptTokens: body.usageMetadata?.promptTokenCount,
              completionTokens: body.usageMetadata?.candidatesTokenCount,
            },
          };

        case "MAX_TOKENS":
          return {
            content,
            toolCalls: [],
            finishReason: "length",
            usage: {
              promptTokens: body.usageMetadata?.promptTokenCount,
              completionTokens: body.usageMetadata?.candidatesTokenCount,
            },
          };

        default:
          throw new Error(
            `[google] Gemini stopped with finishReason "${candidate.finishReason}"${
              candidate.finishMessage ? `: ${candidate.finishMessage}` : ""
            }`,
          );
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error(
            `[google] Gemini request timed out after ${this.timeoutMs}ms`,
          );
        }

        throw error;
      }

      throw new Error("[google] Unknown Gemini request error");
    } finally {
      clearTimeout(timeout);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Provider factory                                                           */
/* -------------------------------------------------------------------------- */

function createProviderService(config: ResolvedLLMConfig): AgentLLMService {
  if (!config.apiKey) {
    console.warn(
      `[llm-service] No API key configured for provider "${config.provider}". Using offline demo mode.`,
    );

    return new OfflineLLMService(config.provider);
  }

  switch (config.provider) {
    case "google":
      return new GoogleGeminiLLMService(
        config.apiKey,
        config.model,
        config.baseUrl,
        config.maxTokens,
        config.timeoutMs,
      );

    case "openrouter":
      return new OpenAICompatibleLLMService(
        "openrouter",
        config.apiKey,
        config.model,
        config.baseUrl,
        config.maxTokens,
        config.timeoutMs,
      );

    case "openai":
      return new OpenAICompatibleLLMService(
        "openai",
        config.apiKey,
        config.model,
        config.baseUrl,
        config.maxTokens,
        config.timeoutMs,
      );

    default:
      throw new Error(
        `[llm-service] Unsupported LLM provider: ${config.provider}`,
      );
  }
}

/* -------------------------------------------------------------------------- */
/* Public factory                                                             */
/* -------------------------------------------------------------------------- */

export function createLLMService(
  config: LLMServiceConfig = {},
): AgentLLMService {
  const resolvedConfig = resolveLLMConfig(config);

  return createProviderService(resolvedConfig);
}
