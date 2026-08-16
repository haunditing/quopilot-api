import { Types } from "mongoose";
import { Product } from "../models/Product.js";

interface GetProductsInput {
  tenantId: string;
  page: number;
  limit: number;
  search?: string;
  status?: "ACTIVE" | "INACTIVE";
  currency?: string;
  minPrice?: number;
  maxPrice?: number;
}

export async function getProducts(input: GetProductsInput) {
  const {
    tenantId,
    page,
    limit,
    search,
    status = "ACTIVE",
    currency,
    minPrice,
    maxPrice,
  } = input;

  if (!Types.ObjectId.isValid(tenantId)) {
    throw new Error("Invalid tenantId");
  }

  const tenantObjectId = new Types.ObjectId(tenantId);

  const filter: Record<string, unknown> = {
    tenantId: tenantObjectId,
    status,
  };

  if (currency?.trim()) {
    filter.currency = currency.trim().toUpperCase();
  }

  const priceFilter: Record<string, number> = {};

  if (minPrice !== undefined) {
    priceFilter.$gte = minPrice;
  }

  if (maxPrice !== undefined) {
    priceFilter.$lte = maxPrice;
  }

  if (Object.keys(priceFilter).length > 0) {
    filter.unitPrice = priceFilter;
  }

  if (search?.trim()) {
    const searchRegex = new RegExp(search.trim(), "i");

    filter.$or = [
      {
        name: searchRegex,
      },
      {
        sku: searchRegex,
      },
      {
        description: searchRegex,
      },
    ];
  }

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    Product.find(filter)
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit)
      .lean(),

    Product.countDocuments(filter),
  ]);

  const pages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages,
    },
  };
}

export async function getProductById(tenantId: string, productId: string) {
  if (!Types.ObjectId.isValid(tenantId)) {
    throw new Error("Invalid tenantId");
  }

  if (!Types.ObjectId.isValid(productId)) {
    throw new Error("Invalid productId");
  }

  const product = await Product.findOne({
    _id: new Types.ObjectId(productId),
    tenantId: new Types.ObjectId(tenantId),
    status: "ACTIVE",
  }).lean();

  if (!product) {
    throw new Error("Product not found");
  }

  return product;
}
