import type { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth-middleware.js";
import {
  createProductSchema,
  updateProductSchema,
  updateProductStatusSchema,
} from "../schemas/product-schema.js";
import {
  createProduct,
  deleteProduct,
  updateProduct,
  updateProductStatus,
} from "../services/product-service.js";
import {
  getProductById,
  getProducts,
} from "../services/product-query-service.js";

function handleProductError(
  res: Response,
  error: unknown,
  fallbackMessage: string,
): void {
  const message = error instanceof Error ? error.message : fallbackMessage;

  if (message === "Product not found") {
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

export async function getProductsController(
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
    const statusParam = req.query.status;
    const categoryParam = req.query.category;
    const itemTypeParam = req.query.itemType;
    const currencyParam = req.query.currency;
    const minPriceParam = req.query.minPrice;
    const maxPriceParam = req.query.maxPrice;

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

    const category =
      typeof categoryParam === "string" ? categoryParam : undefined;

    let itemType: "PRODUCT" | "SERVICE" | "COMBO" | undefined;

    if (itemTypeParam !== undefined) {
      if (
        itemTypeParam !== "PRODUCT" &&
        itemTypeParam !== "SERVICE" &&
        itemTypeParam !== "COMBO"
      ) {
        res.status(400).json({
          message: "Invalid itemType",
        });
        return;
      }

      itemType = itemTypeParam;
    }

    const currency =
      typeof currencyParam === "string" ? currencyParam : undefined;

    const minPrice =
      minPriceParam === undefined ? undefined : Number(minPriceParam);

    const maxPrice =
      maxPriceParam === undefined ? undefined : Number(maxPriceParam);

    if (
      (minPrice !== undefined && (Number.isNaN(minPrice) || minPrice < 0)) ||
      (maxPrice !== undefined && (Number.isNaN(maxPrice) || maxPrice < 0))
    ) {
      res.status(400).json({
        message: "Invalid price range",
      });
      return;
    }

    const result = await getProducts({
      tenantId,
      page,
      limit,
      search,
      status,
      category,
      itemType,
      currency,
      minPrice,
      maxPrice,
    });

    res.status(200).json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load products";

    if (message === "Invalid tenantId") {
      res.status(400).json({
        message,
      });
      return;
    }

    console.error(error);

    res.status(500).json({
      message: "Unable to load products",
    });
  }
}

export async function getProductController(
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

  const productId = req.params.productId;

  if (typeof productId !== "string") {
    res.status(400).json({
      message: "Invalid productId",
    });

    return;
  }

  try {
    const product = await getProductById(tenantId, productId, {
      includeInactive: true,
    });

    res.status(200).json(product);
  } catch (error) {
    handleProductError(res, error, "Unable to load product");
  }
}

export async function createProductController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  if (!req.user?.tenantId) {
    res.status(403).json({
      message: "Tenant context required",
    });

    return;
  }

  const result = createProductSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid product data",
      errors: result.error.flatten(),
    });

    return;
  }

  try {
    const product = await createProduct(result.data, req.user.tenantId);

    res.status(201).json(product);
  } catch (error) {
    handleProductError(res, error, "Unable to create product");
  }
}

export async function updateProductController(
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

  const productId = req.params.productId;

  if (typeof productId !== "string") {
    res.status(400).json({
      message: "Invalid productId",
    });

    return;
  }

  const result = updateProductSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid product data",
      errors: result.error.flatten(),
    });

    return;
  }

  try {
    const product = await updateProduct(tenantId, productId, result.data);

    res.status(200).json(product);
  } catch (error) {
    handleProductError(res, error, "Unable to update product");
  }
}

export async function updateProductStatusController(
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

  const productId = req.params.productId;

  if (typeof productId !== "string") {
    res.status(400).json({
      message: "Invalid productId",
    });

    return;
  }

  const result = updateProductStatusSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid product status",
      errors: result.error.flatten(),
    });

    return;
  }

  try {
    const product = await updateProductStatus(
      tenantId,
      productId,
      result.data.status,
    );

    res.status(200).json(product);
  } catch (error) {
    handleProductError(res, error, "Unable to update product status");
  }
}

export async function deleteProductController(
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

  const productId = req.params.productId;

  if (typeof productId !== "string") {
    res.status(400).json({
      message: "Invalid productId",
    });

    return;
  }

  try {
    await deleteProduct(tenantId, productId);

    res.status(204).send();
  } catch (error) {
    handleProductError(res, error, "Unable to delete product");
  }
}
