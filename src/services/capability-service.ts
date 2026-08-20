import { AppCapability } from "../models/AppCapability.js";
import { Plan } from "../models/Plan.js";

export type CapabilityEffectivenessReason =
  | "ok"
  | "feature_disabled"
  | "capability_disabled"
  | "non_configurable";

export interface CapabilityMatrixEntry {
  code: string;
  module: string;
  name: string;
  description: string;
  kind: string;
  configurableByPlan: boolean;
  nonConfigurableReason?: string;
  status: string;
  dependencies: Array<{ code: string; type: string }>;
  evidence: string;
  effective: boolean;
  reason: CapabilityEffectivenessReason;
}

export interface PlanCapabilityMatrix {
  planKey: string;
  featureKeys: string[];
  capabilityCodes: string[];
  entries: CapabilityMatrixEntry[];
}

export function computeCapabilityEffectiveness(
  capability: {
    code: string;
    module: string;
    configurableByPlan: boolean;
  },
  enabledFeatures: Set<string>,
  enabledCapabilities: Set<string>,
): { effective: boolean; reason: CapabilityEffectivenessReason } {
  if (!capability.configurableByPlan) {
    return { effective: true, reason: "non_configurable" };
  }

  if (!enabledFeatures.has(capability.module)) {
    return { effective: false, reason: "feature_disabled" };
  }

  // Regla: si el plan define enabledCapabilities (no vacío), solo son
  // efectivas las que están listadas. Si está vacío, todas las capacidades
  // de los módulos habilitados quedan efectivas (gate opcional).
  if (enabledCapabilities.size > 0 && !enabledCapabilities.has(capability.code)) {
    return { effective: false, reason: "capability_disabled" };
  }

  return { effective: true, reason: "ok" };
}

export async function getPlanCapabilityMatrix(planKey: string): Promise<PlanCapabilityMatrix> {
  const plan = await Plan.findOne({ key: planKey.toUpperCase() }).lean();
  if (!plan) {
    throw new Error("Plan not found");
  }

  const enabledFeatures = new Set(plan.enabledFeatures ?? []);
  const enabledCapabilities = new Set(plan.enabledCapabilities ?? []);

  const catalog = await AppCapability.find({ isActive: true })
    .sort({ module: 1, sortOrder: 1 })
    .lean();

  const entries: CapabilityMatrixEntry[] = catalog.map((c) => {
    const { effective, reason } = computeCapabilityEffectiveness(c, enabledFeatures, enabledCapabilities);
    return {
      code: c.code,
      module: c.module,
      name: c.name,
      description: c.description,
      kind: c.kind,
      configurableByPlan: c.configurableByPlan,
      nonConfigurableReason: c.nonConfigurableReason,
      status: c.status,
      dependencies: c.dependencies,
      evidence: c.evidence,
      effective,
      reason,
    };
  });

  return {
    planKey: plan.key,
    featureKeys: [...enabledFeatures],
    capabilityCodes: [...enabledCapabilities],
    entries,
  };
}

export async function getEffectiveCapabilityCodes(planKey: string): Promise<string[]> {
  const matrix = await getPlanCapabilityMatrix(planKey);
  return matrix.entries.filter((e) => e.effective).map((e) => e.code);
}

export async function isCapabilityEffective(planKey: string, capabilityCode: string): Promise<boolean> {
  const matrix = await getPlanCapabilityMatrix(planKey);
  return matrix.entries.some((e) => e.code === capabilityCode && e.effective);
}