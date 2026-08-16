import { Response, NextFunction } from "express";
import type { UserRole } from "../types/auth.js";
import { AuthenticatedRequest } from "./auth-middleware.js";

export function authorize(...allowedRoles: UserRole[]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    if (!req.user) {
      res.status(401).json({
        message: "Authentication required",
      });

      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        message: "Insufficient permissions",
      });

      return;
    }

    next();
  };
}
