import { z } from "zod";

const priceListEntrySchema = z.object({
  priceListId: z.string().trim().min(1),
  priceListName: z.string().trim().min(1),
  price: z.number().min(0),
});

const customFieldSchema = z.object({
  fieldId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  value: z.string().trim().min(1),
});

const productImageSchema = z.object({
  url: z.string().trim().min(1),
  publicId: z.string().trim().optional(),
  filename: z.string().trim().optional(),
});

const warehouseStockSchema = z.object({
  name: z.string().trim().min(1),
  quantity: z.number().min(0),
});

export const createProductSchema = z.object({
  itemType: z.enum(["PRODUCT", "SERVICE", "COMBO"]).default("PRODUCT"),
  name: z.string().trim().min(1),
  reference: z.string().trim().optional(),
  description: z.string().trim().optional(),
  category: z.string().trim().optional(),
  unitOfMeasure: z
    .enum([
      "UNIT",
      "KG",
      "LB",
      "LITER",
      "METER",
      "HOUR",
      "PACKAGE",
      "BOX",
      "SET",
    ])
    .optional(),
  code: z.string().trim().optional(),
  sku: z.string().trim().optional(),
  barcode: z.string().trim().optional(),
  basePrice: z.number().min(0).default(0),
  cost: z.number().min(0).optional(),
  taxRate: z.number().min(0).default(0),
  currency: z.string().trim().min(1).default("COP"),
  priceLists: z.array(priceListEntrySchema).optional(),
  customFields: z.array(customFieldSchema).optional(),
  accountingAccount: z.string().trim().optional(),
  incomeAccount: z.string().trim().optional(),
  inventoryAccount: z.string().trim().optional(),
  fiscalCode: z.string().trim().optional(),
  image: productImageSchema.optional(),
  warehouses: z.array(warehouseStockSchema).optional(),
  minStock: z.number().min(0).optional(),
  maxStock: z.number().min(0).optional(),
  lowStockAlert: z.boolean().optional(),
});

export const updateProductSchema = z.object({
  itemType: z.enum(["PRODUCT", "SERVICE", "COMBO"]).optional(),
  name: z.string().trim().min(1).optional(),
  reference: z.string().trim().optional(),
  description: z.string().trim().optional(),
  category: z.string().trim().optional(),
  unitOfMeasure: z
    .enum([
      "UNIT",
      "KG",
      "LB",
      "LITER",
      "METER",
      "HOUR",
      "PACKAGE",
      "BOX",
      "SET",
    ])
    .optional(),
  code: z.string().trim().optional(),
  sku: z.string().trim().optional(),
  barcode: z.string().trim().optional(),
  basePrice: z.number().min(0).optional(),
  cost: z.number().min(0).optional(),
  taxRate: z.number().min(0).optional(),
  currency: z.string().trim().min(1).optional(),
  priceLists: z.array(priceListEntrySchema).optional(),
  customFields: z.array(customFieldSchema).optional(),
  accountingAccount: z.string().trim().optional(),
  incomeAccount: z.string().trim().optional(),
  inventoryAccount: z.string().trim().optional(),
  fiscalCode: z.string().trim().optional(),
  image: productImageSchema.optional(),
  warehouses: z.array(warehouseStockSchema).optional(),
  minStock: z.number().min(0).optional(),
  maxStock: z.number().min(0).optional(),
  lowStockAlert: z.boolean().optional(),
});

export const updateProductStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type UpdateProductStatusInput = z.infer<
  typeof updateProductStatusSchema
>;
