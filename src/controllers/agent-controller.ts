import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth-middleware.js";
import { updateAgentSchema } from "../schemas/agent-schema.js";
import {
  getAgentByTenant,
  provisionAgent,
  updateAgent,
} from "../services/agent-service.js";

function handleAgentError(
  res: Response,
  error: unknown,
  fallbackMessage: string,
): void {
  const message = error instanceof Error ? error.message : fallbackMessage;

  if (message === "Agent not found") {
    res.status(404).json({
      message,
    });

    return;
  }

  if (message === "Invalid tenantId" || message === "Invalid productId") {
    res.status(400).json({
      message,
    });

    return;
  }

  console.error(error);

  res.status(500).json({
    message: fallbackMessage,
  });
}

export async function getAgentConfigController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    res.status(403).json({
      message: "Tenant context required",
    });

    return;
  }

  try {
    let agent = await getAgentByTenant(tenantId);

    if (!agent) {
      agent = await provisionAgent(tenantId);
    }

    res.status(200).json(agent);
  } catch (error) {
    handleAgentError(res, error, "Unable to load agent config");
  }
}

export async function updateAgentConfigController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    res.status(403).json({
      message: "Tenant context required",
    });

    return;
  }

  const result = updateAgentSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid agent config",
      errors: result.error.flatten(),
    });

    return;
  }

  try {
    const agent = await updateAgent(tenantId, result.data);

    res.status(200).json(agent);
  } catch (error) {
    handleAgentError(res, error, "Unable to update agent config");
  }
}
