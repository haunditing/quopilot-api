import { AssistantPlanCapabilities } from "../models/AssistantPlanCapabilities.js";
import type { ToolPermission, AIToolAction, AIExecutionLevel } from "../models/AIAssistantTool.js";
import { AIAssistantTool } from "../models/AIAssistantTool.js";

export async function getAssistantCapabilities(planKey: string) {
  const caps = await AssistantPlanCapabilities.findOne({ planKey: planKey.toUpperCase() }).lean();
  return caps ?? { planKey: planKey.toUpperCase(), toolPermissions: [], globalDefaults: { defaultExecutionLevel: "READ_ONLY", requireConfirmationFor: ["create", "modify", "delete", "execute"] } };
}

export async function getToolPermissionsForPlan(planKey: string) {
  const caps = await getAssistantCapabilities(planKey);
  return caps.toolPermissions ?? [];
}

export async function getToolPermissionsForPrompt(planKey: string): Promise<Record<string, any>> {
  const perms = await getToolPermissionsForPlan(planKey);
  return perms.reduce((acc, p) => {
    acc[p.toolKey] = {
      actions: p.allowedActions,
      level: p.executionLevel,
      confirm: p.requiresConfirmation,
      conditions: p.conditions,
    };
    return acc;
  }, {} as Record<string, any>);
}

export async function getExecutionLevel(planKey: string, toolKey: string): Promise<"READ_ONLY" | "ASSISTED_DRAFT" | "FULL_AUTOMATION"> {
  const perms = await getToolPermissionsForPlan(planKey);
  const perm = perms.find((p) => p.toolKey === toolKey);
  return perm?.executionLevel ?? "READ_ONLY";
}

export async function isCapabilityAllowed(
  planKey: string,
  toolKey: string,
  action: AIToolAction
): Promise<boolean> {
  const perms = await getToolPermissionsForPlan(planKey);
  const perm = perms.find((p) => p.toolKey === toolKey);
  if (!perm) return false;
  return perm.allowedActions.includes(action);
}

export async function requiresConfirmation(planKey: string, toolKey: string, action: AIToolAction): Promise<boolean> {
  const caps = await getAssistantCapabilities(planKey);
  const perm = caps.toolPermissions?.find((p) => p.toolKey === toolKey);
  if (!perm) return true;
  if (perm.requiresConfirmation) return true;
  if (perm.executionLevel === "READ_ONLY") return true;
  return (caps.globalDefaults?.requireConfirmationFor as string[] | undefined)?.includes(action) ?? false;
}

export async function setCapabilitiesForPlan(
  planKey: string,
  toolPermissions: Array<{
    toolKey: string;
    allowedActions: AIToolAction[];
    executionLevel: AIExecutionLevel;
    requiresConfirmation: boolean;
    conditions?: Record<string, unknown>;
  }>
) {
  const key = planKey.toUpperCase();

  return AssistantPlanCapabilities.findOneAndUpdate(
    { planKey: key },
    {
      $set: { toolPermissions },
    },
    {
      returnDocument: "after",
      upsert: true,
      runValidators: true,
    },
  ).lean();
}

export async function updateToolPermission(
  planKey: string,
  toolKey: string,
  updates: Partial<{
    allowedActions: AIToolAction[];
    executionLevel: "READ_ONLY" | "ASSISTED_DRAFT" | "FULL_AUTOMATION";
    requiresConfirmation: boolean;
    conditions: Record<string, unknown>;
  }>
) {
  const caps = await AssistantPlanCapabilities.findOne({ planKey: planKey.toUpperCase() }).lean();

  if (!caps) {
    return AssistantPlanCapabilities.create({
      planKey: planKey.toUpperCase(),
      toolPermissions: [{ toolKey, ...updates }] as any,
    }).then((doc) => doc.toObject());
  }

  const existing = caps.toolPermissions.find((p) => p.toolKey === toolKey);

  if (existing) {
    return AssistantPlanCapabilities.findOneAndUpdate(
      { planKey: planKey.toUpperCase() },
      {
        $set: {
          "toolPermissions.$[tool].allowedActions": updates.allowedActions ?? existing.allowedActions,
          "toolPermissions.$[tool].executionLevel": updates.executionLevel ?? existing.executionLevel,
          "toolPermissions.$[tool].requiresConfirmation": updates.requiresConfirmation ?? existing.requiresConfirmation,
          "toolPermissions.$[tool].conditions": updates.conditions ?? existing.conditions,
        },
      },
      {
        arrayFilters: [{ "tool.toolKey": toolKey }],
        returnDocument: "after",
      },
    ).lean();
  }

  return AssistantPlanCapabilities.findOneAndUpdate(
    { planKey: planKey.toUpperCase() },
    {
      $push: {
        toolPermissions: { toolKey, ...updates },
      },
    },
    { returnDocument: "after" },
  ).lean();
}

export async function deletePlanCapabilities(planKey: string) {
  const result = await (await import("../models/AssistantPlanCapabilities.js")).AssistantPlanCapabilities.findOneAndDelete({ planKey: planKey.toUpperCase() }).lean();
  if (!result) {
    throw new Error("Plan capabilities not found");
  }
  return { id: planKey };
}

export async function getAllToolPermissions(planKey: string) {
  const caps = await getAssistantCapabilities(planKey);
  return caps.toolPermissions ?? [];
}

export async function getExecutionLevelsForPlan(planKey: string): Promise<Record<string, string>> {
  const perms = await getToolPermissionsForPlan(planKey);
  return perms.reduce((acc, p) => {
    acc[p.toolKey] = p.executionLevel;
    return acc;
  }, {} as Record<string, string>);
}