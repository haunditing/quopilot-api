import mongoose, { Types } from "mongoose";
import { Customer } from "../models/Customer.js";
import { Product } from "../models/Product.js";
import { Quote } from "../models/Quote.js";
import type { IQuote, IQuoteItem } from "../models/Quote.js";

import { createQuoteEvent } from "./quote-event-service.js";
import { getNextSequence } from "./sequence-service.js";

function round(value: number): number {
  return Number(value.toFixed(2));
}

function buildQuoteItem(
  item: CreateQuoteItemInput,
  product: {
    _id: Types.ObjectId;
    name: string;
    description?: string;
    unitPrice: number;
  },
): IQuoteItem {
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

interface CreateQuoteItemInput {
  productId: string;
  quantity: number;
  unitPrice?: number;
  discountPercent?: number;
  taxRate?: number;
}

interface CreateQuoteInput {
  customerId: string;
  conversationId?: string;
  items: CreateQuoteItemInput[];
  validUntil?: string;
  notes?: string;
  terms?: string;
}

export async function createQuote(
  input: CreateQuoteInput,
  tenantId: string,
): Promise<IQuote> {
  const {
    customerId,
    conversationId,
    items,
    validUntil,
    notes,
    terms,
  } = input;

  const validUntilDate = validUntil ? new Date(validUntil) : undefined;

  if (!Types.ObjectId.isValid(tenantId)) {
    throw new Error("Invalid tenantId");
  }

  if (!Types.ObjectId.isValid(customerId)) {
    throw new Error("Invalid customerId");
  }

  if (!items.length) {
    throw new Error("Quote must contain at least one item");
  }

  const session = await mongoose.startSession();

  try {
    let createdQuote: IQuote | null = null;

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

      const quoteItems = items.map((item) => {
        const product = products.find(
          (currentProduct) => currentProduct._id.toString() === item.productId,
        );

        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        return buildQuoteItem(item, {
          _id: product._id,
          name: product.name,
          description: product.description,
          unitPrice: product.unitPrice,
        });
      });

      const subtotal = quoteItems.reduce(
        (total, item) => total + item.unitPrice * item.quantity,
        0,
      );

      const totalDiscount = quoteItems.reduce(
        (total, item) =>
          total + item.unitPrice * item.quantity * (item.discountPercent / 100),
        0,
      );

      const totalTax = quoteItems.reduce(
        (total, item) => total + item.taxAmount,
        0,
      );

      const total = quoteItems.reduce(
        (sum, item) => sum + item.totalLine,
        0,
      );

      const sequence = await getNextSequence(tenantId, "QUOTE", session);
      const quoteNumber = `Q-${String(sequence).padStart(6, "0")}`;

      const [quote] = await Quote.create(
        [
          {
            tenantId,
            customerId,
            conversationId,
            documentType: "QUOTE",
            number: quoteNumber,
            items: quoteItems,
            subtotal: round(subtotal),
            totalDiscount: round(totalDiscount),
            totalTax: round(totalTax),
            total: round(total),
            currency: products[0].currency,
            status: "DRAFT",
            validUntil: validUntilDate,
            notes,
            terms,
          },
        ],
        { session },
      );

      await createQuoteEvent({
        tenantId,
        quoteId: quote._id.toString(),
        type: "CREATED",
        session,
      });

      createdQuote = quote;
    });

    if (!createdQuote) {
      throw new Error("Unable to create quote");
    }

    return createdQuote;
  } finally {
    await session.endSession();
  }
}

interface UpdateQuoteInput {
  customerId: string;
  items: CreateQuoteItemInput[];
  validUntil?: string;
  notes?: string;
  terms?: string;
}

export async function updateQuote(
  tenantId: string,
  quoteId: string,
  input: UpdateQuoteInput,
): Promise<IQuote> {
  const { customerId, items, validUntil, notes, terms } = input;

  const validUntilDate = validUntil ? new Date(validUntil) : undefined;

  if (!Types.ObjectId.isValid(tenantId)) {
    throw new Error("Invalid tenantId");
  }

  if (!Types.ObjectId.isValid(quoteId)) {
    throw new Error("Invalid quoteId");
  }

  if (!Types.ObjectId.isValid(customerId)) {
    throw new Error("Invalid customerId");
  }

  if (!items.length) {
    throw new Error("Quote must contain at least one item");
  }

  const session = await mongoose.startSession();

  try {
    let updatedQuote: IQuote | null = null;

    await session.withTransaction(async () => {
      const quote = await Quote.findOne({
        _id: quoteId,
        tenantId,
      }).session(session);

      if (!quote) {
        throw new Error("Quote not found");
      }

      if (quote.status !== "DRAFT") {
        throw new Error(`Quote cannot be updated from status ${quote.status}`);
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

      const quoteItems = items.map((item) => {
        const product = products.find(
          (currentProduct) => currentProduct._id.toString() === item.productId,
        );

        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        return buildQuoteItem(item, {
          _id: product._id,
          name: product.name,
          description: product.description,
          unitPrice: product.unitPrice,
        });
      });

      const subtotal = quoteItems.reduce(
        (total, item) => total + item.unitPrice * item.quantity,
        0,
      );

      const totalDiscount = quoteItems.reduce(
        (total, item) =>
          total + item.unitPrice * item.quantity * (item.discountPercent / 100),
        0,
      );

      const totalTax = quoteItems.reduce(
        (total, item) => total + item.taxAmount,
        0,
      );

      const total = quoteItems.reduce(
        (sum, item) => sum + item.totalLine,
        0,
      );

      quote.customerId = new Types.ObjectId(customerId);
      quote.items = quoteItems;
      quote.subtotal = round(subtotal);
      quote.totalDiscount = round(totalDiscount);
      quote.totalTax = round(totalTax);
      quote.total = round(total);
      quote.currency = products[0].currency;
      quote.validUntil = validUntilDate;
      quote.notes = notes ?? undefined;
      quote.terms = terms ?? undefined;

      await quote.save({ session });

      updatedQuote = quote;
    });

    if (!updatedQuote) {
      throw new Error("Unable to update quote");
    }

    return updatedQuote;
  } finally {
    await session.endSession();
  }
}
