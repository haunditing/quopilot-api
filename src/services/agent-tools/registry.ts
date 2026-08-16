import { AgentEvent } from "../../models/AgentEvent.js";
import type { AgentTool as AgentToolCapability } from "../../models/Agent.js";
import type { AgentToolDefinition } from "../llm-service.js";
import { productTools } from "./tools/product-tools.js";
import { customerTools } from "./tools/customer-tools.js";
import { quoteTools } from "./tools/quote-tools.js";
import { salesTools } from "./tools/sales-tools.js";
import { handoffTools } from "./tools/handoff-tool.js";
import {
  failResult,
  type AgentTool,
  type AgentToolContext,
  type AgentToolPolicy,
  type AgentToolResult,
} from "./types.js";

export const TOOL_CAPABILITY: Record<string, AgentToolCapability> = {
  searchProducts: "PRODUCT_SEARCH",
  getProductDetails: "PRODUCT_DETAILS",
  searchCustomers: "CUSTOMER_LOOKUP",
  getCustomerHistory: "CUSTOMER_HISTORY",
  getQuotes: "QUOTE_HISTORY",
  getQuoteStatus: "QUOTE_DETAILS",
  createQuote: "QUOTE_DRAFT",
  updateQuote: "QUOTE_UPDATE",
  getSales: "SALES_HISTORY",
  updateCustomer: "CUSTOMER_UPDATE",
  requestHumanHandoff: "HUMAN_HANDOFF",
};

export const ALL_TOOL_NAMES: string[] = Object.keys(TOOL_CAPABILITY);

const tools: AgentTool[] = [
  ...productTools,
  ...customerTools,
  ...quoteTools,
  ...salesTools,
  ...handoffTools,
];

const toolMap = new Map<string, AgentTool>(
  tools.map((tool) => [tool.name, tool]),
);

function isToolEnabled(
  capability: AgentToolCapability,
  policy: AgentToolPolicy,
): boolean {
  if (!policy.enabledTools?.length) {
    return true;
  }

  return policy.enabledTools.includes(capability);
}

export function getEnabledToolDefinitions(
  policy: AgentToolPolicy,
): AgentToolDefinition[] {
  return tools
    .filter((tool) => {
      const capability = TOOL_CAPABILITY[tool.name];

      return capability ? isToolEnabled(capability, policy) : false;
    })
    .map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
}

export function listTools(): Array<{
  name: string;
  description: string;
  kind: AgentTool["kind"];
  capability: AgentToolCapability;
}> {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    kind: tool.kind,
    capability: TOOL_CAPABILITY[tool.name],
  }));
}

export async function executeTool(
  ctx: AgentToolContext,
  name: string,
  args: Record<string, unknown>,
): Promise<AgentToolResult> {
  const tool = toolMap.get(name);

  if (!tool) {
    return failResult(`Unknown tool: ${name}`);
  }

  const capability = TOOL_CAPABILITY[name];

  if (capability && !isToolEnabled(capability, ctx.agent)) {
    return failResult(`Tool is not enabled: ${name}`);
  }

  try {
    const result = await tool.execute(ctx, args);

    if (result.ok) {
      await AgentEvent.create({
        tenantId: ctx.tenantId,
        conversationId: ctx.conversationId,
        customerId: ctx.customerId,
        type: "TOOL_EXECUTED",
        data: {
          tool: name,
        },
      });
    }

    return result;
  } catch (error) {
    return failResult(
      error instanceof Error ? error.message : "Tool execution failed",
    );
  }
}
