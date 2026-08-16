import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth-middleware.js";
import { getAgentDashboardSummary } from "../services/agent-dashboard-service.js";

export async function getAgentDashboardController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    if (req.user?.role !== "AGENT" || !req.user.tenantId) {
      res.status(403).json({
        message: "Agent access required",
      });
      return;
    }

    const summary = await getAgentDashboardSummary(req.user.tenantId);

    res.status(200).json(summary);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Unable to load agent dashboard",
    });
  }
}
