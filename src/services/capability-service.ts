import { AppCapability } from "../models/AppCapability.js";
import { AppFeature } from "../models/AppFeature.js";
import { Plan } from "../models/Plan.js";

export type CapabilityEffectivenessReason =
  | "ok"
  | "feature_disabled"
  | "capability_disabled"
  | "dependency_missing"
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

export interface CatalogIntegrityReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Evalúa la efectividad individual de una capacidad.
 * Semántica fail-closed: enabledCapabilities define la lista explícita.
 * Si está vacío o no contiene el código, la capacidad configurable queda deshabilitada.
 */
export function computeCapabilityEffectiveness(
  capability: {
    code: string;
    module: string;
    configurableByPlan: boolean;
    dependencies?: Array<{ code: string; type: string }>;
  },
  enabledFeatures: Set<string>,
  enabledCapabilities: Set<string>,
  effectiveCodesSet?: Set<string>,
): { effective: boolean; reason: CapabilityEffectivenessReason } {
  if (!capability.configurableByPlan) {
    return { effective: true, reason: "non_configurable" };
  }

  if (!enabledFeatures.has(capability.module)) {
    return { effective: false, reason: "feature_disabled" };
  }

  // Semántica fail-closed: [] = ninguna capacidad configurable
  if (enabledCapabilities.size === 0 || !enabledCapabilities.has(capability.code)) {
    return { effective: false, reason: "capability_disabled" };
  }

  if (effectiveCodesSet && capability.dependencies) {
    const missingObligatory = capability.dependencies.some(
      (dep) => dep.type === "OBLIGATORIA" && !effectiveCodesSet.has(dep.code),
    );
    if (missingObligatory) {
      return { effective: false, reason: "dependency_missing" };
    }
  }

  return { effective: true, reason: "ok" };
}

/**
 * Calcula la matriz de efectividad para un catálogo completo resolviendo
 * dependencias OBLIGATORIAS mediante punto fijo.
 */
export function computeCatalogEffectiveness(
  catalog: Array<{
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
  }>,
  enabledFeatures: Set<string>,
  enabledCapabilities: Set<string>,
): CapabilityMatrixEntry[] {
  const stateMap = new Map<string, { effective: boolean; reason: CapabilityEffectivenessReason }>();

  for (const c of catalog) {
    if (!c.configurableByPlan) {
      stateMap.set(c.code, { effective: true, reason: "non_configurable" });
    } else if (!enabledFeatures.has(c.module)) {
      stateMap.set(c.code, { effective: false, reason: "feature_disabled" });
    } else if (enabledCapabilities.size === 0 || !enabledCapabilities.has(c.code)) {
      stateMap.set(c.code, { effective: false, reason: "capability_disabled" });
    } else {
      stateMap.set(c.code, { effective: true, reason: "ok" });
    }
  }

  // Propagación de dependencias OBLIGATORIAS (resolución de punto fijo)
  let changed = true;
  let iterations = 0;
  const maxIterations = 20;

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    for (const c of catalog) {
      const current = stateMap.get(c.code)!;
      if (!current.effective) continue;

      const hasMissingObligatory = c.dependencies.some((dep) => {
        if (dep.type !== "OBLIGATORIA") return false;
        const target = stateMap.get(dep.code);
        return !target || !target.effective;
      });

      if (hasMissingObligatory) {
        stateMap.set(c.code, { effective: false, reason: "dependency_missing" });
        changed = true;
      }
    }
  }

  return catalog.map((c) => {
    const result = stateMap.get(c.code)!;
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
      effective: result.effective,
      reason: result.reason,
    };
  });
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

  const entries = computeCatalogEffectiveness(catalog, enabledFeatures, enabledCapabilities);

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

/**
 * Entitlement Engine: Resuelve si un tenant tiene una capacidad efectiva.
 */
export async function hasTenantCapability(tenant: { plan: string }, capabilityCode: string): Promise<boolean> {
  if (!tenant.plan) return false;
  return isCapabilityEffective(tenant.plan, capabilityCode);
}

/**
 * Entitlement Engine: Resuelve si un tenant tiene una feature habilitada.
 */
export async function hasTenantFeature(tenant: { plan: string }, featureKey: string): Promise<boolean> {
  if (!tenant.plan) return false;
  const plan = await Plan.findOne({ key: tenant.plan.toUpperCase() }).lean();
  if (!plan) return false;
  return plan.enabledFeatures.includes(featureKey);
}

export async function isCapabilityEffective(planKey: string, capabilityCode: string): Promise<boolean> {
  const matrix = await getPlanCapabilityMatrix(planKey);
  return matrix.entries.some((e) => e.code === capabilityCode && e.effective);
}

/**
 * Validador de integridad del catálogo de capacidades (Reglas 1 a 8).
 */
export async function validateCatalogIntegrity(): Promise<CatalogIntegrityReport> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const [features, capabilities] = await Promise.all([
    AppFeature.find({ isActive: true }).lean(),
    AppCapability.find({ isActive: true }).lean(),
  ]);

  const activeFeatureKeys = new Set(features.map((f) => f.key));
  const capabilityMap = new Map<string, (typeof capabilities)[0]>();

  // Regla 2: Unicidad de código
  for (const c of capabilities) {
    if (capabilityMap.has(c.code)) {
      errors.push(`Regla 2 (Unicidad): Código duplicado "${c.code}"`);
    } else {
      capabilityMap.set(c.code, c);
    }
  }

  for (const c of capabilities) {
    // Regla 1: Feature válida
    if (c.configurableByPlan && !activeFeatureKeys.has(c.module)) {
      errors.push(
        `Regla 1 (Feature válida): Capacidad "${c.code}" pertenece al módulo "${c.module}" que no es una feature activa`,
      );
    }

    // Regla 6: Razón de no configurable
    if (!c.configurableByPlan && (!c.nonConfigurableReason || c.nonConfigurableReason.trim() === "")) {
      errors.push(
        `Regla 6 (Razón no-configurable): Capacidad no-configurable "${c.code}" no tiene nonConfigurableReason`,
      );
    }

    // Regla 7: Advertencia por capacidades POR_CONFIRMAR
    if (c.status === "POR_CONFIRMAR") {
      warnings.push(`Regla 7 (POR_CONFIRMAR): Capacidad "${c.code}" está marcada como POR_CONFIRMAR`);
    }

    // Regla 8: Formato módulo.acción
    if (!/^[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+$/.test(c.code)) {
      warnings.push(
        `Regla 8 (Formato código): "${c.code}" no sigue el formato estándar "modulo.accion"`,
      );
    }

    // Validación de dependencias
    for (const dep of c.dependencies) {
      // Regla 3: Dependencia existente
      if (!capabilityMap.has(dep.code)) {
        errors.push(
          `Regla 3 (Dependencia inexistente): "${c.code}" depende de "${dep.code}" que no existe en el catálogo`,
        );
      }

      // Regla 4: Sin auto-dependencia
      if (dep.code === c.code) {
        errors.push(`Regla 4 (Auto-dependencia): "${c.code}" depende de sí misma`);
      }
    }
  }

  // Regla 5: Sin dependencias circulares (detección de ciclos en DAG)
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function checkCycle(code: string, path: string[]): boolean {
    visited.add(code);
    recursionStack.add(code);

    const cap = capabilityMap.get(code);
    if (cap) {
      for (const dep of cap.dependencies) {
        if (!visited.has(dep.code)) {
          if (checkCycle(dep.code, [...path, dep.code])) return true;
        } else if (recursionStack.has(dep.code)) {
          errors.push(
            `Regla 5 (Dependencia circular): Ciclo detectado: ${[...path, dep.code].join(" -> ")}`,
          );
          return true;
        }
      }
    }

    recursionStack.delete(code);
    return false;
  }

  for (const c of capabilities) {
    if (!visited.has(c.code)) {
      checkCycle(c.code, [c.code]);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}