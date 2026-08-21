/**
 * Centralized Declarative Capability Registry
 *
 * Type-safe registry where each backend module registers its own capabilities
 * natively in TypeScript code. No regex scanning, no frontend coupling.
 */

export type CapabilityDomain =
  | "COMMERCIAL"
  | "ADMINISTRATION"
  | "SUPER_ADMIN";

export type UserRole =
  | "COMMERCIAL_AGENT"
  | "ADMIN_ASSISTANT"
  | "TENANT_ADMIN"
  | "SUPER_ADMIN";

export type SubscriptionPlan = "BASIC" | "PRO" | "ENTERPRISE";

export interface Capability {
  module: string;
  code: string;
  name: string;
  description: string;
  kind:
    | "ANALISIS"
    | "DOCUMENTO"
    | "CAMBIO_ESTADO"
    | "OPERACION_COMERCIAL"
    | "COMUNICACION"
    | "AUTENTICACION"
    | "SEGURIDAD"
    | "EDICION"
    | "CREACION"
    | "ELIMINACION"
    | "VISUALIZACION"
    | "IA";
  domain: CapabilityDomain;
  allowedRoles: UserRole[];
  includedInPlans: SubscriptionPlan[];
  dependencies?: { code: string; type: "OBLIGATORIA" | "OPCIONAL" }[];
}

const registry = new Map<string, Capability>();

export function registerCapability(cap: Capability): void {
  if (registry.has(cap.code)) {
    console.warn(
      `[CapabilityRegistry] Duplicate registration for code: ${cap.code}. Overwriting.`,
    );
  }
  registry.set(cap.code, cap);
}

export function registerCapabilities(caps: Capability[]): void {
  for (const cap of caps) {
    registerCapability(cap);
  }
}

export function getCapabilities(): Capability[] {
  return Array.from(registry.values()).sort((a, b) => {
    if (a.module !== b.module) return a.module.localeCompare(b.module);
    return a.code.localeCompare(b.code);
  });
}

export function getCapabilityByCode(code: string): Capability | undefined {
  return registry.get(code);
}

export function getCapabilitiesReport(): {
  generatedAt: string;
  totalCapabilities: number;
  capabilities: Capability[];
} {
  return {
    generatedAt: new Date().toISOString(),
    totalCapabilities: registry.size,
    capabilities: getCapabilities(),
  };
}

export function clearRegistry(): void {
  registry.clear();
}
