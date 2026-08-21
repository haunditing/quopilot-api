import type { SubscriptionPlan, UserRole } from "./registry.js";

export const ALL_USER_ROLES: UserRole[] = [
  "COMMERCIAL_AGENT",
  "ADMIN_ASSISTANT",
  "TENANT_ADMIN",
  "SUPER_ADMIN",
];

export const ALL_PLANS: SubscriptionPlan[] = ["BASIC", "PRO", "ENTERPRISE"];

export const PLANS_PRO_UP: SubscriptionPlan[] = ["PRO", "ENTERPRISE"];

/** Roles operativos/comerciales dentro del tenant. */
export const ROLES_COMMERCIAL: UserRole[] = ["COMMERCIAL_AGENT", "TENANT_ADMIN"];

/** Roles administrativos del tenant. */
export const ROLES_TENANT_ADMIN: UserRole[] = [
  "ADMIN_ASSISTANT",
  "TENANT_ADMIN",
];

/** Cualquier usuario del tenant (comerciales y administrativos). */
export const ROLES_ANY_TENANT_USER: UserRole[] = [
  "COMMERCIAL_AGENT",
  "ADMIN_ASSISTANT",
  "TENANT_ADMIN",
];

/** Solo super administradores de la plataforma. */
export const ROLES_SUPER_ADMIN: UserRole[] = ["SUPER_ADMIN"];
