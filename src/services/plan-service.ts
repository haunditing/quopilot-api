import { Plan } from "../models/Plan.js";
import { AppFeature } from "../models/AppFeature.js";
import { AppCapability } from "../models/AppCapability.js";
import {
  DEFAULT_APP_FEATURES_BY_PLAN,
  DEFAULT_APP_CAPABILITIES_BY_PLAN,
} from "../registry/app-feature-registry.js";

export async function listPlans() {
  return Plan.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
}

export async function listActivePlans() {
  return Plan.find({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 }).lean();
}

export async function getPlanByKey(key: string) {
  return Plan.findOne({ key: key.toUpperCase() }).lean();
}

export async function getDefaultPlan() {
  return Plan.findOne({ isDefault: true, isActive: true }).lean();
}

export async function getPlanEnabledFeatures(key: string): Promise<string[]> {
  const plan = await getPlanByKey(key);
  return plan?.enabledFeatures ?? [];
}

export async function getPlanEnabledCapabilities(key: string): Promise<string[]> {
  const plan = await getPlanByKey(key);
  return plan?.enabledCapabilities ?? [];
}

export async function isFeatureEnabled(planKey: string, featureKey: string): Promise<boolean> {
  const plan = await getPlanByKey(planKey);
  if (!plan) return false;
  return plan.enabledFeatures.includes(featureKey);
}

export async function getFeatureConfig(planKey: string, featureKey: string): Promise<Record<string, unknown> | null> {
  const plan = await getPlanByKey(planKey);
  if (!plan) return null;
  if (!plan.enabledFeatures.includes(featureKey)) return null;
  const feature = await AppFeature.findOne({ key: featureKey }).lean();
  return feature?.metadata ?? null;
}

export async function createPlan(input: {
  key: string;
  name: string;
  description?: string;
  isActive?: boolean;
  isDefault?: boolean;
  enabledFeatures?: string[];
  enabledCapabilities?: string[];
  sortOrder?: number;
}) {
  const key = input.key.toUpperCase();

  if (input.isDefault) {
    await Plan.updateMany({ isDefault: true }, { $set: { isDefault: false } });
  }

  // Baseline explícito si no se proveen listas
  const featuresToValidate =
    input.enabledFeatures ?? DEFAULT_APP_FEATURES_BY_PLAN[key] ?? [];
  const capabilitiesToValidate =
    input.enabledCapabilities ?? DEFAULT_APP_CAPABILITIES_BY_PLAN[key] ?? [];

  // Validate features exist in AppFeature
  const validFeatures = await validateFeatures(featuresToValidate);

  // Validate capabilities exist in AppCapability
  const validCapabilities = await validateCapabilities(capabilitiesToValidate);

  const plan = await Plan.create({
    key,
    name: input.name,
    description: input.description ?? "",
    isActive: input.isActive ?? true,
    isDefault: input.isDefault ?? false,
    enabledFeatures: validFeatures,
    enabledCapabilities: validCapabilities,
    sortOrder: input.sortOrder ?? 0,
  });

  return plan.toObject();
}

export async function updatePlan(key: string, input: {
  name?: string;
  description?: string;
  isActive?: boolean;
  isDefault?: boolean;
  enabledFeatures?: string[];
  enabledCapabilities?: string[];
  sortOrder?: number;
}) {
  if (input.isDefault) {
    await Plan.updateMany({ isDefault: true }, { $set: { isDefault: false } });
  }

  // Validate features if provided
  let validFeatures: string[] | undefined;
  if (input.enabledFeatures) {
    validFeatures = await validateFeatures(input.enabledFeatures);
    input = { ...input, enabledFeatures: validFeatures };
  }

  // Validate capabilities if provided
  if (input.enabledCapabilities) {
    const validCapabilities = await validateCapabilities(input.enabledCapabilities);
    input = { ...input, enabledCapabilities: validCapabilities };
  }

  const plan = await Plan.findOneAndUpdate(
    { key: key.toUpperCase() },
    { $set: input },
    { returnDocument: "after", runValidators: true },
  ).lean();

  if (!plan) {
    throw new Error("Plan not found");
  }

  return plan;
}

export async function deletePlan(key: string) {
  const plan = await Plan.findOneAndDelete({ key: key.toUpperCase() }).lean();

  if (!plan) {
    throw new Error("Plan not found");
  }

  return { id: key };
}

export async function setDefaultPlan(key: string) {
  await Plan.updateMany({ isDefault: true }, { $set: { isDefault: false } });
  const plan = await Plan.findOneAndUpdate(
    { key: key.toUpperCase() },
    { $set: { isDefault: true } },
    { returnDocument: "after" },
  ).lean();

  if (!plan) {
    throw new Error("Plan not found");
  }

  return plan;
}

async function validateFeatures(featureKeys: string[]): Promise<string[]> {
  const features = await AppFeature.find({ key: { $in: featureKeys } }).lean();
  const validKeys = new Set(features.map((f) => f.key));
  return featureKeys.filter((k) => validKeys.has(k));
}

async function validateCapabilities(capabilityCodes: string[]): Promise<string[]> {
  const capabilities = await AppCapability.find({
    code: { $in: capabilityCodes },
    isActive: true,
  }).lean();

  const capabilityMap = new Map(capabilities.map((c) => [c.code, c]));

  // 1. Filtrar solo las que existen y son configurables por plan
  // (Las no-configurables no se guardan en el plan porque siempre son efectivas)
  const validConfigurableCodes = capabilityCodes.filter((code) => {
    const cap = capabilityMap.get(code);
    return cap && cap.configurableByPlan;
  });

  const uniqueCodes = [...new Set(validConfigurableCodes)];
  const codesSet = new Set(uniqueCodes);

  // 2. Validar dependencias OBLIGATORIAS
  for (const code of uniqueCodes) {
    const cap = capabilityMap.get(code);
    if (cap && cap.dependencies) {
      for (const dep of cap.dependencies) {
        if (dep.type === "OBLIGATORIA" && !codesSet.has(dep.code)) {
          // Verificar si la dependencia es no-configurable (siempre efectiva)
          const depCap = await AppCapability.findOne({ code: dep.code }).lean();
          if (!depCap || depCap.configurableByPlan) {
            throw new Error(
              `Integridad de plan: la capacidad "${code}" requiere "${dep.code}" (OBLIGATORIA)`,
            );
          }
        }
      }
    }
  }

  return uniqueCodes;
}