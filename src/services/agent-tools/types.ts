import type { Types } from "mongoose";
import type { AgentTool as AgentToolCapability } from "../../models/Agent.js";

export type AgentToolKind = "READ" | "WRITE";

export type AgentToolCapabilityName = AgentToolCapability;

export interface AgentToolPolicy {
  productScope?: "ALL" | "SELECTED";
  allowedProductIds?: Array<Types.ObjectId | string>;
  enabledTools?: AgentToolCapability[];
}

export interface AgentToolContext {
  tenantId: string;
  conversationId: string;
  customerId: string;
  agent: AgentToolPolicy;
}

export type AgentToolResult =
  | {
      ok: true;
      data: unknown;
    }
  | {
      ok: false;
      error: string;
    };

export interface AgentTool<
  Args extends Record<string, unknown> = Record<string, unknown>,
> {
  name: string;
  description: string;
  kind: AgentToolKind;
  parameters: Record<string, unknown>;
  execute(
    ctx: AgentToolContext,
    args: Args,
  ): Promise<AgentToolResult>;
}

export function okResult(data: unknown): AgentToolResult {
  return {
    ok: true,
    data,
  };
}

export function failResult(error: string): AgentToolResult {
  return {
    ok: false,
    error,
  };
}

export function isProductAllowed(
  productId: string,
  policy: AgentToolPolicy,
): boolean {
  if (policy.productScope !== "SELECTED") {
    return true;
  }

  if (!policy.allowedProductIds?.length) {
    return false;
  }

  return policy.allowedProductIds.some(
    (id) => id.toString() === productId,
  );
}

export function normalizeLimit(
  value: unknown,
  max: number,
  fallback: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(1, Math.floor(value)), max);
}
