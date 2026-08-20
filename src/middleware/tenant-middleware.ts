import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth-middleware.js";
import { Tenant } from "../models/Tenant.js";

export async function requireTenant(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user?.tenantId) {
    res.status(403).json({
      message: "Tenant context required",
    });
    return;
  }

  try {
    const tenant = await Tenant.findById(req.user.tenantId).lean();
    if (!tenant) {
      res.status(404).json({ message: "Tenant not found" });
      return;
    }

    if (tenant.status !== "ACTIVE" && req.user.role !== "SUPER_ADMIN") {
      res.status(403).json({
        message: `Tenant is ${tenant.status.toLowerCase()}`,
        code: "TENANT_NOT_ACTIVE",
      });
      return;
    }

    (req as any).tenant = tenant;
    next();
  } catch (error) {
    console.error("[TenantMiddleware] Error loading tenant:", error);
    res.status(500).json({ message: "Internal tenant middleware error" });
  }
}
