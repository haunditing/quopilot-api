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

function calculateUnitPrice(basePrice: number, taxRate: number): number {
  return Number((basePrice * (1 + taxRate)).toFixed(2));
}

export async function createProduct(
  input: CreateProductInput,
  tenantId: string,
) {
  const unitPrice = calculateUnitPrice(input.basePrice, input.taxRate);

  const product = await Product.create({
    tenantId,
    itemType: input.itemType,
    name: input.name,
    reference: input.reference,
    description: input.description,
    category: input.category,
    unitOfMeasure: input.unitOfMeasure,
    code: input.code,
    sku: input.sku,
    barcode: input.barcode,
    basePrice: input.basePrice,
    cost: input.cost,
    taxRate: input.taxRate,
    unitPrice,
    currency: input.currency,
    status: "ACTIVE",
    priceLists: input.priceLists,
    customFields: input.customFields,
    accountingAccount: input.accountingAccount,
    incomeAccount: input.incomeAccount,
    inventoryAccount: input.inventoryAccount,
    fiscalCode: input.fiscalCode,
    image: input.image,
    warehouses: input.warehouses,
    minStock: input.minStock,
    maxStock: input.maxStock,
    lowStockAlert: input.lowStockAlert,
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

  if (input.itemType !== undefined) update.itemType = input.itemType;
  if (input.name !== undefined) update.name = input.name;
  if (input.reference !== undefined) update.reference = input.reference;
  if (input.description !== undefined) update.description = input.description;
  if (input.category !== undefined) update.category = input.category;
  if (input.unitOfMeasure !== undefined)
    update.unitOfMeasure = input.unitOfMeasure;
  if (input.code !== undefined) update.code = input.code;
  if (input.sku !== undefined) update.sku = input.sku;
  if (input.barcode !== undefined) update.barcode = input.barcode;

  if (input.basePrice !== undefined) update.basePrice = input.basePrice;
  if (input.cost !== undefined) update.cost = input.cost;
  if (input.taxRate !== undefined) update.taxRate = input.taxRate;

  const basePrice =
    input.basePrice !== undefined
      ? input.basePrice
      : (await Product.findById(productId).lean())?.basePrice ?? 0;

  const taxRate =
    input.taxRate !== undefined
      ? input.taxRate
      : (await Product.findById(productId).lean())?.taxRate ?? 0;

  update.unitPrice = calculateUnitPrice(basePrice, taxRate);

  if (input.currency !== undefined) update.currency = input.currency;
  if (input.priceLists !== undefined) update.priceLists = input.priceLists;
  if (input.customFields !== undefined) update.customFields = input.customFields;
  if (input.accountingAccount !== undefined)
    update.accountingAccount = input.accountingAccount;
  if (input.incomeAccount !== undefined)
    update.incomeAccount = input.incomeAccount;
  if (input.inventoryAccount !== undefined)
    update.inventoryAccount = input.inventoryAccount;
  if (input.fiscalCode !== undefined) update.fiscalCode = input.fiscalCode;
  if (input.image !== undefined) update.image = input.image;
  if (input.warehouses !== undefined) update.warehouses = input.warehouses;
  if (input.minStock !== undefined) update.minStock = input.minStock;
  if (input.maxStock !== undefined) update.maxStock = input.maxStock;
  if (input.lowStockAlert !== undefined)
    update.lowStockAlert = input.lowStockAlert;

  const product = await Product.findOneAndUpdate(
    {
      _id: new Types.ObjectId(productId),
      tenantId: new Types.ObjectId(tenantId),
    },
    update,
    {
      returnDocument: "after",
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
      returnDocument: "after",
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
