import { Types } from "mongoose";
import { Product } from "../models/Product.js";
import type {
  CreateProductInput,
  UpdateProductInput,
  UpdateProductStatusInput,
} from "../schemas/product-schema.js";

function assertValidId(id: string, field = "id"): void {
  if (!Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ${field}`);
  }
}

export async function createProduct(
  input: CreateProductInput,
  tenantId: string,
) {
  const product = await Product.create({
    tenantId,
    name: input.name,
    description: input.description,
    sku: input.sku,
    unitPrice: input.unitPrice,
    currency: input.currency,
    status: "ACTIVE",
  });

  return product.toObject();
}

export async function updateProduct(
  tenantId: string,
  productId: string,
  input: UpdateProductInput,
) {
  assertValidId(tenantId, "tenantId");
  assertValidId(productId, "productId");

  const update: Record<string, unknown> = {};

  if (input.name !== undefined) {
    update.name = input.name;
  }

  if (input.description !== undefined) {
    update.description = input.description;
  }

  if (input.sku !== undefined) {
    update.sku = input.sku;
  }

  if (input.unitPrice !== undefined) {
    update.unitPrice = input.unitPrice;
  }

  if (input.currency !== undefined) {
    update.currency = input.currency;
  }

  const product = await Product.findOneAndUpdate(
    {
      _id: new Types.ObjectId(productId),
      tenantId: new Types.ObjectId(tenantId),
    },
    update,
    {
      new: true,
      runValidators: true,
    },
  ).lean();

  if (!product) {
    throw new Error("Product not found");
  }

  return product;
}

export async function updateProductStatus(
  tenantId: string,
  productId: string,
  status: UpdateProductStatusInput["status"],
) {
  assertValidId(tenantId, "tenantId");
  assertValidId(productId, "productId");

  const product = await Product.findOneAndUpdate(
    {
      _id: new Types.ObjectId(productId),
      tenantId: new Types.ObjectId(tenantId),
    },
    {
      status,
    },
    {
      new: true,
      runValidators: true,
    },
  ).lean();

  if (!product) {
    throw new Error("Product not found");
  }

  return product;
}

export async function deleteProduct(tenantId: string, productId: string) {
  assertValidId(tenantId, "tenantId");
  assertValidId(productId, "productId");

  const product = await Product.findOneAndDelete({
    _id: new Types.ObjectId(productId),
    tenantId: new Types.ObjectId(tenantId),
  });

  if (!product) {
    throw new Error("Product not found");
  }

  return {
    id: productId,
  };
}
