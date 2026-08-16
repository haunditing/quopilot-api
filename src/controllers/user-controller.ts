import type { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth-middleware.js";
import {
  createAgentSchema,
  updateUserSchema,
  updateUserStatusSchema,
} from "../schemas/user-schema.js";
import {
  createAgent,
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
  updateUserStatus,
} from "../services/user-service.js";

function handleUserError(
  res: Response,
  error: unknown,
  fallbackMessage: string,
): void {
  const message = error instanceof Error ? error.message : fallbackMessage;

  if (message === "User not found") {
    res.status(404).json({
      message,
    });

    return;
  }

  if (message === "A user with this email already exists") {
    res.status(409).json({
      message,
    });

    return;
  }

  if (
    message === "Invalid tenantId" ||
    message === "Invalid userId"
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

export async function createAgentController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  if (!req.user?.tenantId) {
    res.status(403).json({
      message: "Tenant context required",
    });

    return;
  }

  const result = createAgentSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid user data",
      errors: result.error.flatten(),
    });

    return;
  }

  try {
    const user = await createAgent(result.data, req.user.tenantId);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      tenantId: user.tenantId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    handleUserError(res, error, "Unable to create user");
  }
}

export async function getUsersController(
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
    const pageParam = req.query.page;
    const limitParam = req.query.limit;
    const searchParam = req.query.search;
    const statusParam = req.query.status;
    const dateFromParam = req.query.dateFrom;
    const dateToParam = req.query.dateTo;

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

    const search = typeof searchParam === "string" ? searchParam : undefined;

    const status = typeof statusParam === "string" ? statusParam : undefined;

    const dateFrom =
      typeof dateFromParam === "string" ? dateFromParam : undefined;

    const dateTo = typeof dateToParam === "string" ? dateToParam : undefined;

    const result = await getUsers({
      tenantId,
      page,
      limit,
      search,
      status,
      dateFrom,
      dateTo,
    });

    res.status(200).json(result);
  } catch (error) {
    handleUserError(res, error, "Unable to load users");
  }
}

export async function getUserController(
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

  const userId = req.params.userId;

  if (typeof userId !== "string") {
    res.status(400).json({
      message: "Invalid userId",
    });

    return;
  }

  try {
    const user = await getUserById(tenantId, userId);

    res.status(200).json(user);
  } catch (error) {
    handleUserError(res, error, "Unable to load user");
  }
}

export async function updateUserController(
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

  const userId = req.params.userId;

  if (typeof userId !== "string") {
    res.status(400).json({
      message: "Invalid userId",
    });

    return;
  }

  const result = updateUserSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid user data",
      errors: result.error.flatten(),
    });

    return;
  }

  try {
    const user = await updateUser(tenantId, userId, result.data);

    res.status(200).json(user);
  } catch (error) {
    handleUserError(res, error, "Unable to update user");
  }
}

export async function updateUserStatusController(
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

  const userId = req.params.userId;

  if (typeof userId !== "string") {
    res.status(400).json({
      message: "Invalid userId",
    });

    return;
  }

  const result = updateUserStatusSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid user status",
      errors: result.error.flatten(),
    });

    return;
  }

  try {
    const user = await updateUserStatus(tenantId, userId, result.data.status);

    res.status(200).json(user);
  } catch (error) {
    handleUserError(res, error, "Unable to update user status");
  }
}

export async function deleteUserController(
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

  const userId = req.params.userId;

  if (typeof userId !== "string") {
    res.status(400).json({
      message: "Invalid userId",
    });

    return;
  }

  try {
    await deleteUser(tenantId, userId);

    res.status(204).send();
  } catch (error) {
    handleUserError(res, error, "Unable to delete user");
  }
}
