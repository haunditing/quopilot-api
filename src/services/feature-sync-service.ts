import { AppFeature } from "../models/AppFeature.js";
import { AIAssistantTool } from "../models/AIAssistantTool.js";
import { AppCapability } from "../models/AppCapability.js";
import { AppUsageLimit } from "../models/AppUsageLimit.js";
import { AssistantPlanCapabilities } from "../models/AssistantPlanCapabilities.js";
import { Plan } from "../models/Plan.js";
import { APP_FEATURES_REGISTRY } from "../registry/app-feature-registry.js";
import { APP_USAGE_LIMITS_REGISTRY } from "../registry/app-usage-limit-registry.js";
import {
  AI_TOOLS_REGISTRY,
  DEFAULT_ASSISTANT_CAPABILITIES_BY_PLAN,
} from "../registry/ai-tools-registry.js";
import { getCapabilitiesReport, type Capability } from "../capabilities/index.js";
import {
  validateCatalogIntegrity,
  type CatalogIntegrityReport,
} from "./capability-service.js";

export interface ReconcileCounts {
  added: number;
  updated: number;
  reactivated: number;
  deactivated: number;
}

export interface PruneCounts {
  plansUpdated: number;
  assistantConfigsUpdated: number;
}

export interface CatalogReconcileResult {
  dryRun: boolean;
  features: ReconcileCounts;
  capabilities: ReconcileCounts;
  tools: ReconcileCounts;
  usageLimits: ReconcileCounts;
  pruning: PruneCounts;
  integrity: CatalogIntegrityReport;
}

interface ReconcileOptions<TSource> {
  model: unknown;
  sourceEntries: TSource[];
  keyField: keyof TSource & string;
  /**
   * Normaliza claves antes de comparar código vs BD.
   * Ej.: AppFeature fuerza uppercase en el schema, el código usa minúsculas.
   */
  normalizeKey?: (key: string) => string;
  /** Documento completo para crear o reactivar. */
  buildDoc: (entry: TSource) => Record<string, unknown>;
  /**
   * Campos a actualizar si difieren; retorna null o {} cuando no hay cambios.
   * Debe excluir campos administrativos (status, isActive, sortOrder de admin, etc.)
   * para que la reconciliación no pise decisiones manuales.
   */
  diffFields: (
    entry: TSource,
    existing: Record<string, unknown>,
  ) => Record<string, unknown> | null;
  dryRun: boolean;
}

/**
 * Reconcilia una colección contra su fuente en código:
 * - Alta: entrada nueva en código -> crear.
 * - Cambio: campos difieren -> $set puntual.
 * - Reactivación: existía pero estaba inactiva y vuelve a existir en código -> activar + refrescar.
 * - Baja: activa en BD pero ausente del código -> desactivar (soft delete).
 */
async function reconcileCollection<TSource extends object>(
  options: ReconcileOptions<TSource>,
): Promise<ReconcileCounts> {
  const {
    model,
    sourceEntries,
    keyField,
    buildDoc,
    diffFields,
    dryRun,
  } = options;
  const normalizeKey = options.normalizeKey ?? ((key: string) => key);

  const counts: ReconcileCounts = {
    added: 0,
    updated: 0,
    reactivated: 0,
    deactivated: 0,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Model = model as any;
  const existingDocs = (await Model.find().lean()) as Array<
    Record<string, unknown> & { _id: unknown; isActive?: boolean }
  >;

  const byKey = new Map(
    existingDocs.map((doc) => [
      normalizeKey(String(doc[keyField])),
      doc,
    ]),
  );
  const sourceKeys = new Set(
    sourceEntries.map((entry) =>
      normalizeKey(String(entry[keyField])),
    ),
  );

  for (const entry of sourceEntries) {
    const key = String(entry[keyField]);
    const existing = byKey.get(normalizeKey(key));

    if (!existing) {
      counts.added++;
      if (!dryRun) {
        await Model.create(buildDoc(entry));
      }
      continue;
    }

    if (!existing.isActive) {
      counts.reactivated++;
      if (!dryRun) {
        await Model.updateOne(
          { _id: existing._id },
          { $set: { ...buildDoc(entry), isActive: true } },
          { runValidators: true },
        );
      }
      continue;
    }

    const changes = diffFields(entry, existing);
    if (changes && Object.keys(changes).length > 0) {
      counts.updated++;
      if (!dryRun) {
        await Model.updateOne(
          { _id: existing._id },
          { $set: changes },
          { runValidators: true },
        );
      }
    }
  }

  for (const doc of existingDocs) {
    const key = normalizeKey(String(doc[keyField]));
    if (!sourceKeys.has(key) && doc.isActive !== false) {
      counts.deactivated++;
      if (!dryRun) {
        await Model.updateOne(
          { _id: doc._id },
          { $set: { isActive: false } },
        );
      }
    }
  }

  return counts;
}

function pickChanged(
  existing: Record<string, unknown>,
  candidate: Record<string, unknown>,
): Record<string, unknown> | null {
  const changes: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(candidate)) {
    const current = existing[field];
    const bothObjects =
      typeof value === "object" &&
      value !== null &&
      typeof current === "object" &&
      current !== null;
    const differs = bothObjects
      ? JSON.stringify(value) !== JSON.stringify(current)
      : current !== value;
    if (differs) {
      changes[field] = value;
    }
  }
  return Object.keys(changes).length > 0 ? changes : null;
}

function buildCapabilityDoc(cap: Capability): Record<string, unknown> {
  return {
    module: cap.module,
    code: cap.code,
    name: cap.name,
    description: cap.description,
    kind: cap.kind,
    domain: cap.domain,
    allowedRoles: cap.allowedRoles,
    includedInPlans: cap.includedInPlans,
    configurableByPlan: true,
    dependencies: cap.dependencies ?? [],
    evidence: "",
    status: "POR_CONFIRMAR",
    isActive: true,
    sortOrder: 0,
  };
}

/**
 * Remueve referencias huérfanas (features/capacidades/tools/límites que ya
 * no existen en código) de los planes y configuraciones de asistente.
 */
async function pruneOrphanReferences(
  active: {
    featureKeys: Set<string>;
    capabilityCodes: Set<string>;
    usageLimitCodes: Set<string>;
    toolKeys: Set<string>;
  },
  dryRun: boolean,
): Promise<PruneCounts> {
  const result: PruneCounts = {
    plansUpdated: 0,
    assistantConfigsUpdated: 0,
  };

  const plans = await Plan.find().lean();
  for (const plan of plans) {
    const enabledFeatures = (plan.enabledFeatures ?? []).filter((key) =>
      active.featureKeys.has(key.toLowerCase()),
    );
    const enabledCapabilities = (plan.enabledCapabilities ?? []).filter(
      (code) => active.capabilityCodes.has(code),
    );
    const usageLimits = (plan.usageLimits ?? []).filter((limit) =>
      active.usageLimitCodes.has(limit.code),
    );

    const changedFeatures = enabledFeatures.length !== (plan.enabledFeatures ?? []).length;
    const changedCapabilities =
      enabledCapabilities.length !== (plan.enabledCapabilities ?? []).length;
    const changedLimits = usageLimits.length !== (plan.usageLimits ?? []).length;

    if (changedFeatures || changedCapabilities || changedLimits) {
      result.plansUpdated++;
      if (!dryRun) {
        const $set: Record<string, unknown> = {};
        if (changedFeatures) $set.enabledFeatures = enabledFeatures;
        if (changedCapabilities) $set.enabledCapabilities = enabledCapabilities;
        if (changedLimits) $set.usageLimits = usageLimits;
        await Plan.updateOne({ _id: plan._id }, { $set });
      }
    }
  }

  const assistantConfigs = await AssistantPlanCapabilities.find().lean();
  for (const config of assistantConfigs) {
    const toolPermissions = (config.toolPermissions ?? []).filter((permission) =>
      active.toolKeys.has(permission.toolKey.toLowerCase()),
    );
    if (toolPermissions.length !== (config.toolPermissions ?? []).length) {
      result.assistantConfigsUpdated++;
      if (!dryRun) {
        await AssistantPlanCapabilities.updateOne(
          { _id: config._id },
          { $set: { toolPermissions } },
        );
      }
    }
  }

  return result;
}

async function migrateExistingPlansToExplicitCapabilities(): Promise<void> {
  const plans = await Plan.find();
  const catalog = await AppCapability.find({
    isActive: true,
    configurableByPlan: true,
  }).lean();

  for (const plan of plans) {
    if (!plan.enabledCapabilities || plan.enabledCapabilities.length === 0) {
      const enabledFeatures = new Set(plan.enabledFeatures || []);
      const codesToMaterialize = catalog
        .filter((c) => enabledFeatures.has(c.module.toLowerCase()))
        .map((c) => c.code);

      if (codesToMaterialize.length > 0) {
        await Plan.updateOne(
          { _id: plan._id },
          { $set: { enabledCapabilities: codesToMaterialize } },
        );
      }
    }

    if (!plan.usageLimits || plan.usageLimits.length === 0) {
      const defaultUsageLimits = APP_USAGE_LIMITS_REGISTRY.map((ul) => ({
        code: ul.code,
        limit: ul.defaultValue,
      }));
      await Plan.updateOne(
        { _id: plan._id },
        { $set: { usageLimits: defaultUsageLimits } },
      );
    }
  }
}

async function syncDefaultCapabilitiesForPlans(): Promise<void> {
  const plans = await Plan.find().lean();

  for (const plan of plans) {
    const existingCaps = await AssistantPlanCapabilities.findOne({
      planKey: plan.key,
    });

    if (!existingCaps) {
      const caps = getDefaultCapabilitiesForPlan(plan.key);
      if (caps) {
        await AssistantPlanCapabilities.create({
          planKey: plan.key,
          toolPermissions: caps.map((c) => ({
            toolKey: c.toolKey,
            allowedActions: c.allowedActions,
            executionLevel: c.executionLevel,
            requiresConfirmation: c.requiresConfirmation,
          })),
          globalDefaults: {
            defaultExecutionLevel: "READ_ONLY",
            requireConfirmationFor: ["create", "modify", "delete", "execute"],
          },
        });
      }
    }
  }
}

function getDefaultCapabilitiesForPlan(planKey: string) {
  const caps = DEFAULT_ASSISTANT_CAPABILITIES_BY_PLAN[planKey];
  if (!caps) return null;

  return caps.map((c) => ({
    toolKey: c.toolKey,
    allowedActions: c.allowedActions,
    executionLevel: c.executionLevel,
    requiresConfirmation: c.requiresConfirmation,
  }));
}

/**
 * Reconciliación declarativa del catálogo (por demanda):
 * el código es la fuente de verdad y solo se actúa sobre diferencias.
 *
 * Fuentes:
 * - Features / Tools / UsageLimits: registros estáticos (src/registry/*).
 * - Capacidades: registro declarativo en memoria (src/capabilities/*),
 *   cargado al importar los módulos de rutas y herramientas IA.
 *
 * Con dryRun=true calcula el diff sin escribir en la base de datos.
 */
export async function syncCatalogManually(
  options: { dryRun?: boolean } = {},
): Promise<CatalogReconcileResult> {
  const dryRun = options.dryRun ?? false;

  const features = await reconcileCollection({
    model: AppFeature,
    sourceEntries: APP_FEATURES_REGISTRY,
    keyField: "key",
    // El schema de AppFeature fuerza uppercase; comparamos case-insensitive.
    normalizeKey: (key) => key.toLowerCase(),
    buildDoc: (feature) => ({ ...feature }),
    diffFields: (feature, existing) =>
      pickChanged(existing, {
        label: feature.label,
        description: feature.description,
        category: feature.category,
        sortOrder: feature.sortOrder,
      }),
    dryRun,
  });

  const capabilities = await reconcileCollection<Capability>({
    model: AppCapability,
    sourceEntries: getCapabilitiesReport().capabilities,
    keyField: "code",
    buildDoc: buildCapabilityDoc,
    // Se preservan status/evidence/configurableByPlan administrados manualmente.
    diffFields: (cap, existing) =>
      pickChanged(existing, {
        module: cap.module,
        name: cap.name,
        description: cap.description,
        kind: cap.kind,
        domain: cap.domain,
        allowedRoles: cap.allowedRoles,
        includedInPlans: cap.includedInPlans,
        dependencies: cap.dependencies ?? [],
      }),
    dryRun,
  });

  const tools = await reconcileCollection({
    model: AIAssistantTool,
    sourceEntries: AI_TOOLS_REGISTRY,
    keyField: "key",
    // El schema de AIAssistantTool fuerza uppercase; comparamos case-insensitive.
    normalizeKey: (key) => key.toLowerCase(),
    buildDoc: (tool) => ({ ...tool }),
    diffFields: (tool, existing) =>
      pickChanged(existing, {
        label: tool.label,
        description: tool.description,
        category: tool.category,
        defaultExecutionLevel: tool.defaultExecutionLevel,
        availableActions: tool.availableActions,
        requiresConfirmation: tool.requiresConfirmation,
        sortOrder: tool.sortOrder,
      }),
    dryRun,
  });

  const usageLimits = await reconcileCollection({
    model: AppUsageLimit,
    sourceEntries: APP_USAGE_LIMITS_REGISTRY,
    keyField: "code",
    buildDoc: (limit) => ({ ...limit }),
    diffFields: (limit, existing) =>
      pickChanged(existing, {
        name: limit.name,
        description: limit.description,
        unit: limit.unit,
        defaultValue: limit.defaultValue,
        sortOrder: limit.sortOrder,
      }),
    dryRun,
  });

  const pruning = await pruneOrphanReferences(
    {
      featureKeys: new Set(APP_FEATURES_REGISTRY.map((f) => f.key.toLowerCase())),
      capabilityCodes: new Set(getCapabilitiesReport().capabilities.map((c) => c.code)),
      usageLimitCodes: new Set(APP_USAGE_LIMITS_REGISTRY.map((ul) => ul.code)),
      toolKeys: new Set(AI_TOOLS_REGISTRY.map((t) => t.key.toLowerCase())),
    },
    dryRun,
  );

  if (!dryRun) {
    await migrateExistingPlansToExplicitCapabilities();
    await syncDefaultCapabilitiesForPlans();
  }

  const integrity = await validateCatalogIntegrity();
  if (!integrity.valid) {
    console.warn(
      `[FeatureSync] Catalog integrity issues: ${integrity.errors.length} errors.`,
    );
  }

  return {
    dryRun,
    features,
    capabilities,
    tools,
    usageLimits,
    pruning,
    integrity,
  };
}
