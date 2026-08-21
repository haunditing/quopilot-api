import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth-middleware.js";
import { getUserCapabilities } from "../services/user-capability-service.js";
import { Tenant } from "../models/Tenant.js";

export async function getMeCapabilitiesController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    if (user.role === "SUPER_ADMIN") {
      const result = await getUserCapabilities({
        systemRole: user.role,
      });
      res.status(200).json(result);
      return;
    }

    if (!user.tenantId) {
      res.status(403).json({ message: "Tenant context required" });
      return;
    }

    const tenant = await Tenant.findById(user.tenantId)
      .select("plan status")
      .lean();

    if (!tenant) {
      res.status(404).json({ message: "Tenant not found" });
      return;
    }

    const result = await getUserCapabilities({
      systemRole: user.role,
      planKey: tenant.plan,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("[MeCapabilities] Error:", error);
    res.status(500).json({ message: "Unable to load user capabilities" });
  }
}
