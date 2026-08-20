import { Tenant } from "../models/Tenant.js";
import { Plan } from "../models/Plan.js";
import { Customer } from "../models/Customer.js";
import { Product } from "../models/Product.js";
import { Quote } from "../models/Quote.js";
import { Sale } from "../models/Sale.js";
import { User } from "../models/User.js";
import { Channel } from "../models/Channel.js";
import { Types } from "mongoose";
import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth-middleware.js";

export interface UsageCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  limitCode: string;
}

export async function checkUsageLimit(
  tenantId: string,
  limitCode: string,
  increment = 1,
): Promise<UsageCheckResult> {
  if (!Types.ObjectId.isValid(tenantId)) {
    throw new Error("Invalid tenantId");
  }
  const tenantObjectId = new Types.ObjectId(tenantId);

  const tenant = await Tenant.findById(tenantId).select("plan").lean();
  if (!tenant || !tenant.plan) {
    return { allowed: true, current: 0, limit: -1, limitCode };
  }

  const plan = await Plan.findOne({ key: tenant.plan.toUpperCase() }).lean();
  let limit = -1; // Por defecto sin límite si el plan no lo define explícitamente

  if (plan && Array.isArray(plan.usageLimits)) {
    const found = plan.usageLimits.find((ul) => ul.code === limitCode);
    if (found) {
      limit = found.limit;
    }
  }

  // -1 significa ilimitado / no limitado explícitamente por el plan
  if (limit < 0) {
    return { allowed: true, current: 0, limit: -1, limitCode };
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  let current = 0;
  switch (limitCode) {
    case "customers.max":
      current = await Customer.countDocuments({ tenantId: tenantObjectId, isLead: { $ne: true } });
      break;
    case "products.max":
      current = await Product.countDocuments({ tenantId: tenantObjectId });
      break;
    case "quotes.maxMonthly":
      current = await Quote.countDocuments({ tenantId: tenantObjectId, createdAt: { $gte: startOfMonth } });
      break;
    case "sales.maxMonthly":
      current = await Sale.countDocuments({ tenantId: tenantObjectId, createdAt: { $gte: startOfMonth } });
      break;
    case "agents.maxActive":
      current = await User.countDocuments({ tenantId: tenantObjectId, role: "AGENT", status: "ACTIVE" });
      break;
    case "channels.max":
      current = await Channel.countDocuments({ tenantId: tenantObjectId, status: "ACTIVE" });
      break;
    case "ai.queriesMonthly":
      current = 0;
      break;
    default:
      current = 0;
  }

  const allowed = (current + increment) <= limit;
  return { allowed, current, limit, limitCode };
}

/**
 * Middleware para bloquear operaciones si se excede el límite de uso del plan.
 */
export function requireUsageLimit(limitCode: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const tenantId = req.user?.tenantId || (req as any).tenant?._id?.toString();
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context missing for usage check" });
    }

    try {
      const result = await checkUsageLimit(tenantId, limitCode, 1);
      if (!result.allowed) {
        return res.status(429).json({
          message: `Límite de uso excedido para ${limitCode} (${result.current}/${result.limit}). Actualiza tu plan para continuar.`,
          code: "QUOTA_EXCEEDED",
          limitCode,
          current: result.current,
          limit: result.limit,
        });
      }
      next();
    } catch (error) {
      console.error(`[UsageLimit] Error checking limit ${limitCode}:`, error);
      res.status(500).json({ message: "Internal usage limit check error" });
    }
  };
}
