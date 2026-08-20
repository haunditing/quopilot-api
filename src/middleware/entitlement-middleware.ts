import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth-middleware.js";
import { isCapabilityEffective } from "../services/capability-service.js";

/**
 * Middleware de Entitlement: Bloquea el acceso si el plan del tenant
 * no tiene la capacidad efectiva (incluyendo checks de feature y dependencias).
 */
export function requireCapability(capabilityCode: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // El tenant y su plan vienen inyectados por requireTenant
    const tenant = (req as any).tenant;

    if (!tenant || !tenant.plan) {
      return res.status(403).json({
        message: "Tenant plan context missing",
        code: "PLAN_CONTEXT_MISSING",
      });
    }

    try {
      const effective = await isCapabilityEffective(tenant.plan, capabilityCode);

      if (!effective) {
        return res.status(403).json({
          message: `Tu plan actual no incluye la capacidad: ${capabilityCode}`,
          code: "CAPABILITY_REQUIRED",
          capability: capabilityCode,
        });
      }

      next();
    } catch (error) {
      console.error(`[Entitlement] Error checking capability ${capabilityCode}:`, error);
      res.status(500).json({ message: "Internal entitlement error" });
    }
  };
}
