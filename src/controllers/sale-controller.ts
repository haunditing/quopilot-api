import type { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth-middleware.js";
import { deleteSale } from "../services/sale-service.js";
import { getSaleDetail, getSales } from "../services/sale-query-service.js";

function handleSaleError(
  res: Response,
  error: unknown,
  fallbackMessage: string,
): void {
  const message = error instanceof Error ? error.message : fallbackMessage;

  if (message === "Sale not found") {
    res.status(404).json({
      message,
    });

    return;
  }

  if (
    message === "Invalid tenantId" ||
    message === "Invalid customerId" ||
    message === "Invalid productId" ||
    message === "Invalid saleId"
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

export async function getSalesController(
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
    const statusParam = req.query.status;
    const customerIdParam = req.query.customerId;
    const productIdParam = req.query.productId;
    const searchParam = req.query.search;
    const minTotalParam = req.query.minTotal;
    const maxTotalParam = req.query.maxTotal;
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

    let status: "CONFIRMED" | "CANCELLED" | undefined;

    if (statusParam !== undefined) {
      if (statusParam !== "CONFIRMED" && statusParam !== "CANCELLED") {
        res.status(400).json({
          message: "Invalid status",
        });
        return;
      }

      status = statusParam;
    }

    const customerId =
      typeof customerIdParam === "string" ? customerIdParam : undefined;

    const productId =
      typeof productIdParam === "string" ? productIdParam : undefined;

    const search = typeof searchParam === "string" ? searchParam : undefined;

    const minTotal =
      minTotalParam === undefined ? undefined : Number(minTotalParam);

    const maxTotal =
      maxTotalParam === undefined ? undefined : Number(maxTotalParam);

    if (
      (minTotal !== undefined && (Number.isNaN(minTotal) || minTotal < 0)) ||
      (maxTotal !== undefined && (Number.isNaN(maxTotal) || maxTotal < 0))
    ) {
      res.status(400).json({
        message: "Invalid total range",
      });
      return;
    }

    const dateFrom =
      typeof dateFromParam === "string" ? dateFromParam : undefined;

    const dateTo = typeof dateToParam === "string" ? dateToParam : undefined;

    const result = await getSales({
      tenantId,
      page,
      limit,
      status,
      customerId,
      productId,
      search,
      minTotal,
      maxTotal,
      dateFrom,
      dateTo,
    });

    res.status(200).json(result);
  } catch (error) {
    handleSaleError(res, error, "Unable to load sales");
  }
}

export async function getSaleController(
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

  const saleId = req.params.saleId;

  if (typeof saleId !== "string") {
    res.status(400).json({
      message: "Invalid saleId",
    });

    return;
  }

  try {
    const detail = await getSaleDetail(tenantId, saleId);

    res.status(200).json(detail);
  } catch (error) {
    handleSaleError(res, error, "Unable to load sale");
  }
}

export async function deleteSaleController(
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

  const saleId = req.params.saleId;

  if (typeof saleId !== "string") {
    res.status(400).json({
      message: "Invalid saleId",
    });

    return;
  }

  try {
    await deleteSale(tenantId, saleId);

    res.status(204).send();
  } catch (error) {
    handleSaleError(res, error, "Unable to delete sale");
  }
}
