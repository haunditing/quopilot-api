import { AssistantPlanCapabilities } from "../models/AssistantPlanCapabilities.js";
import type { FunctionalityCapabilities } from "../models/AssistantPlanCapabilities.js";

const ALL_CAPABILITIES: AssistantCapability[] = ["consult", "explain", "create", "modify", "delete", "execute"];

type AssistantCapability = "consult" | "explain" | "create" | "modify" | "delete" | "execute";

export async function getAssistantCapabilities(planKey: string) {
  const caps = await AssistantPlanCapabilities.findOne({ planKey: planKey.toUpperCase() }).lean();
  return caps ?? { planKey: planKey.toUpperCase(), functionalities: [] };
}

export async function getCapability(planKey: string, functionalityKey: string, capability: AssistantCapability): Promise<boolean> {
  const caps = await getAssistantCapabilities(planKey);
  const func = caps.functionalities.find((f) => f.functionalityKey === functionalityKey);
  return func?.capabilities[capability] ?? false;
}

export async function getAllCapabilitiesForPlan(planKey: string): Promise<Record<string, Record<string, boolean>>> {
  const caps = await getAssistantCapabilities(planKey);
  const result: Record<string, Record<string, boolean>> = {};
  for (const func of caps.functionalities) {
    result[func.functionalityKey] = func.capabilities;
  }
  return result;
}

export async function isCapabilityAllowed(
  planKey: string,
  functionalityKey: string,
  capability: "consult" | "explain" | "create" | "modify" | "delete" | "execute"
): Promise<boolean> {
  const caps = await getAssistantCapabilities(planKey);
  const func = caps.functionalities.find((f) => f.functionalityKey === functionalityKey);
  return func?.capabilities[capability] ?? false;
}

export async function setCapabilitiesForPlan(
  planKey: string,
  functionalities: Array<{
    functionalityKey: string;
    capabilities: Record<"consult" | "explain" | "create" | "modify" | "delete" | "execute", boolean>;
  }>
) {
  const key = planKey.toUpperCase();

  return AssistantPlanCapabilities.findOneAndUpdate(
    { planKey: key },
    {
      $set: { functionalities },
    },
    {
      returnDocument: "after",
      upsert: true,
      runValidators: true,
    },
  ).lean();
}

export async function updateFunctionalityCapabilities(
  planKey: string,
  functionalityKey: string,
  capabilities: Partial<Record<"consult" | "explain" | "create" | "modify" | "delete" | "execute", boolean>>
) {
  const caps = await AssistantPlanCapabilities.findOne({ planKey: planKey.toUpperCase() }).lean();

  if (!caps) {
    return AssistantPlanCapabilities.create({
      planKey: planKey.toUpperCase(),
      functionalities: [{ functionalityKey, capabilities: { consult: false, explain: false, create: false, modify: false, delete: false, execute: false, ...capabilities } }],
    }).then((doc) => doc.toObject());
  }

  const existing = caps.functionalities.find((f) => f.functionalityKey === functionalityKey);

  if (existing) {
    return AssistantPlanCapabilities.findOneAndUpdate(
      { planKey: planKey.toUpperCase() },
      {
        $set: {
          "functionalities.$[func].capabilities": { ...existing.capabilities, ...capabilities },
        },
      },
      {
        arrayFilters: [{ "func.functionalityKey": functionalityKey }],
        returnDocument: "after",
      },
    ).lean();
  }

  return AssistantPlanCapabilities.findOneAndUpdate(
    { planKey: planKey.toUpperCase() },
    {
      $push: {
        functionalities: {
          functionalityKey,
          capabilities: { consult: false, explain: false, create: false, modify: false, delete: false, execute: false, ...capabilities },
        },
      },
    },
    { returnDocument: "after" },
  ).lean();
}

export async function deletePlanCapabilities(planKey: string) {
  const result = await AssistantPlanCapabilities.findOneAndDelete({ planKey: planKey.toUpperCase() }).lean();
  if (!result) {
    throw new Error("Plan capabilities not found");
  }
  return { id: planKey };
}