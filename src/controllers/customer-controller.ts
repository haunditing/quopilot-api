import type { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth-middleware.js";
import {
  createCustomerSchema,
  updateCustomerSchema,
} from "../schemas/customer-schema.js";
import {
  createCustomer,
  deleteCustomer,
  updateCustomer,
} from "../services/customer-service.js";
import { getCustomers } from "../services/customer-query-service.js";

function handleCustomerError(
  res: Response,
  error: unknown,
  fallbackMessage: string,
): void {
  const message = error instanceof Error ? error.message : fallbackMessage;

  if (message === "Customer not found") {
    res.status(404).json({
      message,
    });

    return;
  }

  if (message === "Invalid tenantId" || message === "Invalid customerId") {
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

export async function getCustomersController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      res.status(403).json({
        message: "Tenant context required",
      });
      return;
    }

    const pageParam = req.query.page;
    const limitParam = req.query.limit;
    const searchParam = req.query.search;
    const countryParam = req.query.country;

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

    const country =
      typeof countryParam === "string" ? countryParam : undefined;

    const userId = req.user?.role === "AGENT" ? req.user.id : undefined;

    const result = await getCustomers({
      tenantId,
      page,
      limit,
      search,
      country,
      userId,
    });

    res.status(200).json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load customers";

    if (message === "Invalid tenantId") {
      res.status(400).json({
        message,
      });
      return;
    }

    console.error(error);

    res.status(500).json({
      message: "Unable to load customers",
    });
  }
}

export async function createCustomerController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  if (!req.user?.tenantId) {
    res.status(403).json({
      message: "Tenant context required",
    });

    return;
  }

  const result = createCustomerSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid customer data",
      errors: result.error.flatten(),
    });

    return;
  }

  try {
    const customer = await createCustomer(result.data, req.user.tenantId);

    res.status(201).json(customer);
  } catch (error) {
    handleCustomerError(res, error, "Unable to create customer");
  }
}

export async function updateCustomerController(
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

  const customerId = req.params.customerId;

  if (typeof customerId !== "string") {
    res.status(400).json({
      message: "Invalid customerId",
    });

    return;
  }

  const result = updateCustomerSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid customer data",
      errors: result.error.flatten(),
    });

    return;
  }

  try {
    const customer = await updateCustomer(tenantId, customerId, result.data);

    res.status(200).json(customer);
  } catch (error) {
    handleCustomerError(res, error, "Unable to update customer");
  }
}

export async function deleteCustomerController(
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

  const customerId = req.params.customerId;

  if (typeof customerId !== "string") {
    res.status(400).json({
      message: "Invalid customerId",
    });

    return;
  }

  try {
    await deleteCustomer(tenantId, customerId);

    res.status(204).send();
  } catch (error) {
    handleCustomerError(res, error, "Unable to delete customer");
  }
}
