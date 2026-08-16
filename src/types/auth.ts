export type UserRole =
  | "SUPER_ADMIN"
  | "ACCOUNT_MANAGER"
  | "TENANT_ADMIN"
  | "AGENT";

export interface AuthUser {
  id: string;
  role: UserRole;
  tenantId?: string;
}
