import { Types } from "mongoose";
import { Agent } from "../models/Agent.js";
import type { UpdateAgentInput } from "../schemas/agent-schema.js";

const DEFAULT_AGENT_NAME = "Asistente Comercial";

function assertValidTenantId(tenantId: string): void {
  if (!Types.ObjectId.isValid(tenantId)) {
    throw new Error("Invalid tenantId");
  }
}

function assertValidProductIds(productIds: string[]): Types.ObjectId[] {
  return productIds.map((productId) => {
    if (!Types.ObjectId.isValid(productId)) {
      throw new Error("Invalid productId");
    }

    return new Types.ObjectId(productId);
  });
}

function buildUpdate(input: UpdateAgentInput): Record<string, unknown> {
  const update: Record<string, unknown> = {};

  if (input.name !== undefined) {
    update.name = input.name;
  }

  if (input.description !== undefined) {
    update.description = input.description;
  }

  if (input.personality !== undefined) {
    update.personality = input.personality;
  }

  if (input.systemInstructions !== undefined) {
    update.systemInstructions = input.systemInstructions;
  }

  if (input.language !== undefined) {
    update.language = input.language;
  }

  if (input.tone !== undefined) {
    update.tone = input.tone;
  }

  if (input.commercialObjective !== undefined) {
    update.commercialObjective = input.commercialObjective;
  }

  if (input.welcomeMessage !== undefined) {
    update.welcomeMessage = input.welcomeMessage;
  }

  if (input.behaviorRules !== undefined) {
    update.behaviorRules = input.behaviorRules;
  }

  if (input.productScope !== undefined) {
    update.productScope = input.productScope;
  }

  if (input.allowedProductIds !== undefined) {
    update.allowedProductIds = assertValidProductIds(input.allowedProductIds);
  }

  if (input.enabledTools !== undefined) {
    update.enabledTools = input.enabledTools;
  }

  if (input.status !== undefined) {
    update.status = input.status;
  }

  if (input.escalation) {
    if (input.escalation.enabled !== undefined) {
      update["escalation.enabled"] = input.escalation.enabled;
    }

    if (input.escalation.keywords !== undefined) {
      update["escalation.keywords"] = input.escalation.keywords;
    }

    if (input.escalation.fallbackMessage !== undefined) {
      update["escalation.fallbackMessage"] = input.escalation.fallbackMessage;
    }
  }

  if (input.memory) {
    if (input.memory.enabled !== undefined) {
      update["memory.enabled"] = input.memory.enabled;
    }

    if (input.memory.messageWindow !== undefined) {
      update["memory.messageWindow"] = input.memory.messageWindow;
    }

    if (input.memory.maxContextTokens !== undefined) {
      update["memory.maxContextTokens"] = input.memory.maxContextTokens;
    }

    if (input.memory.summarizationEnabled !== undefined) {
      update["memory.summarizationEnabled"] = input.memory.summarizationEnabled;
    }
  }

  if (input.llm) {
    if (input.llm.apiKey !== undefined) {
      update["llm.apiKey"] = input.llm.apiKey;
    }

    if (input.llm.model !== undefined) {
      update["llm.model"] = input.llm.model;
    }

    if (input.llm.baseUrl !== undefined) {
      update["llm.baseUrl"] = input.llm.baseUrl;
    }

    if (input.llm.maxTokens !== undefined) {
      update["llm.maxTokens"] = input.llm.maxTokens;
    }

    if (input.llm.timeoutMs !== undefined) {
      update["llm.timeoutMs"] = input.llm.timeoutMs;
    }
  }

  return update;
}

export async function getAgentByTenant(tenantId: string) {
  assertValidTenantId(tenantId);

  return Agent.findOne({
    tenantId,
  }).lean();
}

export async function provisionAgent(tenantId: string) {
  assertValidTenantId(tenantId);

  return Agent.findOneAndUpdate(
    {
      tenantId,
    },
    {
      $setOnInsert: {
        tenantId,
        name: DEFAULT_AGENT_NAME,
      },
    },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    },
  ).lean();
}

export async function updateAgent(tenantId: string, input: UpdateAgentInput) {
  assertValidTenantId(tenantId);

  const update = buildUpdate(input);

  const operation: {
    $set: Record<string, unknown>;
    $setOnInsert?: Record<string, unknown>;
  } = {
    $set: update,
  };

  if (update.name === undefined) {
    operation.$setOnInsert = {
      name: DEFAULT_AGENT_NAME,
    };
  }

  const agent = await Agent.findOneAndUpdate(
    {
      tenantId,
    },
    operation,
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    },
  ).lean();

  if (!agent) {
    throw new Error("Agent not found");
  }

  return agent;
}
