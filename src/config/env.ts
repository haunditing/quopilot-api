const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3000),
  mongodbUri: process.env.MONGODB_URI ?? "",
  llmModel: process.env.LLM_MODEL ?? "gpt-4o-mini",
  llmBaseUrl: process.env.LLM_BASE_URL ?? "https://api.openai.com/v1",
  llmMaxTokens: Number(process.env.LLM_MAX_TOKENS ?? 1024),
  llmRequestTimeoutMs: Number(process.env.LLM_REQUEST_TIMEOUT_MS ?? 30000),
  agentMaxToolIterations: Number(process.env.AGENT_MAX_TOOL_ITERATIONS ?? 5),
  agentMemoryWindow: Number(process.env.AGENT_MEMORY_WINDOW ?? 30),
  agentContextBudget: Number(process.env.AGENT_CONTEXT_BUDGET ?? 12000),
  channelSecret:
    process.env.CHANNEL_SECRET ??
    (process.env.NODE_ENV === "production" ? "" : process.env.JWT_SECRET ?? ""),
  conversationIdleTimeoutMs: Number(
    process.env.CONVERSATION_IDLE_TIMEOUT_MS ?? 30 * 60 * 1000,
  ),
  conversationSweepIntervalMs: Number(
    process.env.CONVERSATION_SWEEP_INTERVAL_MS ?? 60 * 1000,
  ),
};

if (!env.mongodbUri) {
  throw new Error("MONGODB_URI is required");
}

if (env.nodeEnv === "production" && !process.env.CHANNEL_SECRET) {
  throw new Error("CHANNEL_SECRET is required in production");
}

export default env;
