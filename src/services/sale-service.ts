import mongoose, { Types } from "mongoose";
import { Customer } from "../models/Customer.js";
import { Product } from "../models/Product.js";
import { Sale } from "../models/Sale.js";
import type { ISale, ISaleItem } from "../models/Sale.js";

import { createSaleEvent } from "./sale-event-service.js";
import { getNextSequence } from "./sequence-service.js";

function round(value: number): number {
  return Number(value.toFixed(2));
}

function buildSaleItem(
  item: CreateSaleItemInput,
  product: {
    _id: Types.ObjectId;
    name: string;
    description?: string;
    unitPrice: number;
  },
): ISaleItem {
  const quantity = item.quantity;
  const unitPrice = item.unitPrice ?? product.unitPrice;
  const discountPercent = item.discountPercent ?? 0;
  const taxRate = item.taxRate ?? 0;

  const grossSubtotal = unitPrice * quantity;
  const discountAmount = grossSubtotal * (discountPercent / 100);
  const subtotal = grossSubtotal - discountAmount;
  const taxAmount = subtotal * taxRate;
  const totalLine = subtotal + taxAmount;

  return {
    productId: product._id,
    name: product.name,
    description: product.description,
    quantity,
    unitPrice,
    discountPercent,
    taxRate,
    subtotal: round(subtotal),
    taxAmount: round(taxAmount),
    totalLine: round(totalLine),
  };
}

interface CreateSaleItemInput {
  productId: string;
  quantity: number;
  unitPrice?: number;
  discountPercent?: number;
  taxRate?: number;
}

interface CreateSaleInput {
  customerId: string;
  quoteId?: string;
  items: CreateSaleItemInput[];
  notes?: string;
  terms?: string;
}

export async function createSale(
  input: CreateSaleInput,
  tenantId: string,
): Promise<ISale> {
  const { customerId, quoteId, items, notes, terms } = input;

  if (!Types.ObjectId.isValid(tenantId)) {
    throw new Error("Invalid tenantId");
  }

  if (!Types.ObjectId.isValid(customerId)) {
    throw new Error("Invalid customerId");
  }

  if (!items.length) {
    throw new Error("Sale must contain at least one item");
  }

  const session = await mongoose.startSession();

  try {
    let createdSale: ISale | null = null;

    await session.withTransaction(async () => {
      const customer = await Customer.findOne({
        _id: customerId,
        tenantId,
      }).session(session);

      if (!customer) {
        throw new Error("Customer not found");
      }

      if (customer.isLead) {
        customer.isLead = false;
        await customer.save({ session });
      }

      const productIds = items.map((item) => item.productId);
      const uniqueProductIds = [...new Set(productIds)];

      const products = await Product.find({
        _id: { $in: uniqueProductIds },
        tenantId,
        status: "ACTIVE",
      }).session(session);

      if (products.length !== uniqueProductIds.length) {
        throw new Error("One or more products are invalid");
      }

      const saleItems = items.map((item) => {
        const product = products.find(
          (currentProduct) => currentProduct._id.toString() === item.productId,
        );

        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        return buildSaleItem(item, {
          _id: product._id,
          name: product.name,
          description: product.description,
          unitPrice: product.unitPrice,
        });
      });

      const subtotal = saleItems.reduce(
        (total, item) => total + item.unitPrice * item.quantity,
        0,
      );

      const totalDiscount = saleItems.reduce(
        (total, item) =>
          total + item.unitPrice * item.quantity * (item.discountPercent / 100),
        0,
      );

      const totalTax = saleItems.reduce(
        (total, item) => total + item.taxAmount,
        0,
      );

      const total = saleItems.reduce((sum, item) => sum + item.totalLine, 0);

      const sequence = await getNextSequence(tenantId, "SALE", session);
      const saleNumber = `S-${String(sequence).padStart(6, "0")}`;

      const [sale] = await Sale.create(
        [
          {
            tenantId,
            customerId,
            quoteId: quoteId ? new Types.ObjectId(quoteId) : undefined,
            documentType: "SALE",
            number: saleNumber,
            items: saleItems,
            subtotal: round(subtotal),
            totalDiscount: round(totalDiscount),
            totalTax: round(totalTax),
            total: round(total),
            currency: products[0].currency,
            status: "DRAFT",
            notes,
            terms,
          },
        ],
        { session },
      );

      await createSaleEvent({
        tenantId,
        saleId: sale._id.toString(),
        type: "CREATED",
        session,
      });

      createdSale = sale;
    });

    if (!createdSale) {
      throw new Error("Unable to create sale");
    }

    return createdSale;
  } finally {
    await session.endSession();
  }
}

interface UpdateSaleInput {
  customerId: string;
  items: CreateSaleItemInput[];
  validUntil?: string;
  notes?: string;
  terms?: string;
}

export async function updateSale(
  tenantId: string,
  saleId: string,
  input: UpdateSaleInput,
): Promise<ISale> {
  const { customerId, items, validUntil, notes, terms } = input;

  const validUntilDate = validUntil ? new Date(validUntil) : undefined;

  if (!Types.ObjectId.isValid(tenantId)) {
    throw new Error("Invalid tenantId");
  }

  if (!Types.ObjectId.isValid(saleId)) {
    throw new Error("Invalid saleId");
  }

  if (!Types.ObjectId.isValid(customerId)) {
    throw new Error("Invalid customerId");
  }

  if (!items.length) {
    throw new Error("Sale must contain at least one item");
  }

  const session = await mongoose.startSession();

  try {
    let updatedSale: ISale | null = null;

    await session.withTransaction(async () => {
      const sale = await Sale.findOne({
        _id: saleId,
        tenantId,
      }).session(session);

      if (!sale) {
        throw new Error("Sale not found");
      }

      if (sale.status !== "DRAFT") {
        throw new Error(`Sale cannot be updated from status ${sale.status}`);
      }

      const customer = await Customer.findOne({
        _id: customerId,
        tenantId,
      }).session(session);

      if (!customer) {
        throw new Error("Customer not found");
      }

      if (customer.isLead) {
        customer.isLead = false;
        await customer.save({ session });
      }

      const productIds = items.map((item) => item.productId);
      const uniqueProductIds = [...new Set(productIds)];

      const products = await Product.find({
        _id: { $in: uniqueProductIds },
        tenantId,
        status: "ACTIVE",
      }).session(session);

      if (products.length !== uniqueProductIds.length) {
        throw new Error("One or more products are invalid");
      }

      const saleItems = items.map((item) => {
        const product = products.find(
          (currentProduct) => currentProduct._id.toString() === item.productId,
        );

        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        return buildSaleItem(item, {
          _id: product._id,
          name: product.name,
          description: product.description,
          unitPrice: product.unitPrice,
        });
      });

      const subtotal = saleItems.reduce(
        (total, item) => total + item.unitPrice * item.quantity,
        0,
      );

      const totalDiscount = saleItems.reduce(
        (total, item) =>
          total + item.unitPrice * item.quantity * (item.discountPercent / 100),
        0,
      );

      const totalTax = saleItems.reduce(
        (total, item) => total + item.taxAmount,
        0,
      );

      const total = saleItems.reduce((sum, item) => sum + item.totalLine, 0);

      sale.customerId = new Types.ObjectId(customerId);
      sale.items = saleItems;
      sale.subtotal = round(subtotal);
      sale.totalDiscount = round(totalDiscount);
      sale.totalTax = round(totalTax);
      sale.total = round(total);
      sale.currency = products[0].currency;
      sale.notes = notes ?? undefined;
      sale.terms = terms ?? undefined;

      await sale.save({ session });

      updatedSale = sale;
    });

    if (!updatedSale) {
      throw new Error("Unable to update sale");
    }

    return updatedSale;
  } finally {
    await session.endSession();
  }
}
