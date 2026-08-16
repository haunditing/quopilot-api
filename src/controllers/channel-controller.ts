import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth-middleware.js";
import {
  createChannelSchema,
  updateChannelSchema,
  updateChannelStatusSchema,
} from "../schemas/channel-schema.js";
import {
  createChannel,
  deleteChannel,
  setChannelStatus,
  updateChannel,
} from "../services/channel-service.js";
import {
  getChannelById,
  listChannels,
  toPublicChannel,
} from "../services/channel-query-service.js";

function handleChannelError(
  res: Response,
  error: unknown,
  fallbackMessage: string,
): void {
  const message = error instanceof Error ? error.message : fallbackMessage;

  if (message === "Channel not found") {
    res.status(404).json({
      message,
    });

    return;
  }

  if (
    message === "Invalid tenantId" ||
    message === "Invalid channelId" ||
    message === "Invalid agentId" ||
    message === "No agent configured for this tenant"
  ) {
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

function getTenantId(
  req: AuthenticatedRequest,
  res: Response,
): string | undefined {
  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    res.status(403).json({
      message: "Tenant context required",
    });
  }

  return tenantId;
}

export async function listChannelsController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = getTenantId(req, res);

  if (!tenantId) {
    return;
  }

  const pageParam = req.query.page;
  const limitParam = req.query.limit;
  const typeParam = req.query.type;
  const statusParam = req.query.status;
  const agentIdParam = req.query.agentId;

  const page = pageParam === undefined ? 1 : Number(pageParam);
  const limit = limitParam === undefined ? 20 : Number(limitParam);

  if (!Number.isInteger(page) || page < 1) {
    res.status(400).json({
      message: "Invalid page",
    });

    return;
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    res.status(400).json({
      message: "Invalid limit. Must be between 1 and 100",
    });

    return;
  }

  let type: "WHATSAPP" | "WEB_CHAT" | "INSTAGRAM" | undefined;

  if (typeParam !== undefined) {
    if (
      typeParam !== "WHATSAPP" &&
      typeParam !== "WEB_CHAT" &&
      typeParam !== "INSTAGRAM"
    ) {
      res.status(400).json({
        message: "Invalid type",
      });

      return;
    }

    type = typeParam;
  }

  let status: "ACTIVE" | "INACTIVE" | undefined;

  if (statusParam !== undefined) {
    if (statusParam !== "ACTIVE" && statusParam !== "INACTIVE") {
      res.status(400).json({
        message: "Invalid status",
      });

      return;
    }

    status = statusParam;
  }

  const agentId =
    typeof agentIdParam === "string" ? agentIdParam : undefined;

  try {
    const result = await listChannels({
      tenantId,
      page,
      limit,
      type,
      status,
      agentId,
    });

    res.status(200).json({
      data: result.data.map(toPublicChannel),
      pagination: result.pagination,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load channels";

    if (message === "Invalid tenantId" || message === "Invalid agentId") {
      res.status(400).json({
        message,
      });

      return;
    }

    console.error(error);

    res.status(500).json({
      message: "Unable to load channels",
    });
  }
}

export async function getChannelController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = getTenantId(req, res);

  if (!tenantId) {
    return;
  }

  const channelId = req.params.channelId;

  if (typeof channelId !== "string") {
    res.status(400).json({
      message: "Invalid channelId",
    });

    return;
  }

  try {
    const channel = await getChannelById(tenantId, channelId);

    res.status(200).json(toPublicChannel(channel));
  } catch (error) {
    handleChannelError(res, error, "Unable to load channel");
  }
}

export async function createChannelController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = getTenantId(req, res);

  if (!tenantId) {
    return;
  }

  const result = createChannelSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid channel data",
      errors: result.error.flatten(),
    });

    return;
  }

  try {
    const channel = await createChannel(tenantId, result.data);

    res.status(201).json(toPublicChannel(channel));
  } catch (error) {
    handleChannelError(res, error, "Unable to create channel");
  }
}

export async function updateChannelController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = getTenantId(req, res);

  if (!tenantId) {
    return;
  }

  const channelId = req.params.channelId;

  if (typeof channelId !== "string") {
    res.status(400).json({
      message: "Invalid channelId",
    });

    return;
  }

  const result = updateChannelSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid channel data",
      errors: result.error.flatten(),
    });

    return;
  }

  try {
    const channel = await updateChannel(tenantId, channelId, result.data);

    res.status(200).json(toPublicChannel(channel));
  } catch (error) {
    handleChannelError(res, error, "Unable to update channel");
  }
}

export async function updateChannelStatusController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = getTenantId(req, res);

  if (!tenantId) {
    return;
  }

  const channelId = req.params.channelId;

  if (typeof channelId !== "string") {
    res.status(400).json({
      message: "Invalid channelId",
    });

    return;
  }

  const result = updateChannelStatusSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid channel status",
      errors: result.error.flatten(),
    });

    return;
  }

  try {
    const channel = await setChannelStatus(
      tenantId,
      channelId,
      result.data.status,
    );

    res.status(200).json(toPublicChannel(channel));
  } catch (error) {
    handleChannelError(res, error, "Unable to update channel status");
  }
}

export async function deleteChannelController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tenantId = getTenantId(req, res);

  if (!tenantId) {
    return;
  }

  const channelId = req.params.channelId;

  if (typeof channelId !== "string") {
    res.status(400).json({
      message: "Invalid channelId",
    });

    return;
  }

  try {
    await deleteChannel(tenantId, channelId);

    res.status(204).send();
  } catch (error) {
    handleChannelError(res, error, "Unable to delete channel");
  }
}
