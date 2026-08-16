import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth-middleware.js";

export function requireTenant(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user?.tenantId) {
    res.status(403).json({
      message: "Tenant context required",
    });

    return;
  }

  next();
}
