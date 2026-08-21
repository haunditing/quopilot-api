import {
  getCapabilities,
  type Capability,
  type CapabilityDomain,
  type UserRole,
} from "../capabilities/index.js";
import { getEffectiveCapabilityCodes } from "./capability-service.js";

/**
 * Mapea los roles del sistema (JWT/User) a los roles del registro de
 * capacidades. Sin mapeo => sin capacidades por rol (fail-closed).
 */
const SYSTEM_ROLE_TO_USER_ROLE: Record<string, UserRole> = {
  AGENT: "COMMERCIAL_AGENT",
  ACCOUNT_MANAGER: "COMMERCIAL_AGENT",
  TENANT_ADMIN: "TENANT_ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
};

export function mapSystemRole(systemRole: string): UserRole | null {
  return SYSTEM_ROLE_TO_USER_ROLE[systemRole] ?? null;
}

export interface DomainCapabilitySummary {
  code: string;
  module: string;
  name: string;
  description: string;
  kind: Capability["kind"];
}

export interface UserCapabilitiesResult {
  planKey: string | null;
  role: UserRole | null;
  totalCapabilities: number;
  codes: string[];
  byDomain: Record<CapabilityDomain, DomainCapabilitySummary[]>;
}

const EMPTY_BY_DOMAIN = (): Record<CapabilityDomain, DomainCapabilitySummary[]> => ({
  COMMERCIAL: [],
  ADMINISTRATION: [],
  SUPER_ADMIN: [],
});

/**
 * Intersección real en runtime:
 *   Capacidades permitidas = Capacidades efectivas del plan del tenant
 *                            ∩ Capacidades habilitadas para el rol del usuario
 *
 * SUPER_ADMIN no está sujeto a plan: recibe todas las capacidades de su rol.
 */
export async function getUserCapabilities(params: {
  systemRole: string;
  planKey?: string | null;
}): Promise<UserCapabilitiesResult> {
  const { systemRole } = params;
  const isSuperAdmin = systemRole === "SUPER_ADMIN";
  const planKey = isSuperAdmin ? null : params.planKey ?? null;

  const role = mapSystemRole(systemRole);
  const empty: UserCapabilitiesResult = {
    planKey,
    role,
    totalCapabilities: 0,
    codes: [],
    byDomain: EMPTY_BY_DOMAIN(),
  };

  if (!role) return empty;

  const effectiveCodes = new Set<string>(
    isSuperAdmin
      ? getCapabilities().map((c) => c.code)
      : planKey
        ? await getEffectiveCapabilityCodes(planKey)
        : [],
  );

  const byDomain = EMPTY_BY_DOMAIN();
  const codes: string[] = [];

  for (const cap of getCapabilities()) {
    if (!cap.allowedRoles.includes(role)) continue;
    if (!effectiveCodes.has(cap.code)) continue;

    codes.push(cap.code);
    byDomain[cap.domain].push({
      code: cap.code,
      module: cap.module,
      name: cap.name,
      description: cap.description,
      kind: cap.kind,
    });
  }

  return {
    planKey,
    role,
    totalCapabilities: codes.length,
    codes,
    byDomain,
  };
}
