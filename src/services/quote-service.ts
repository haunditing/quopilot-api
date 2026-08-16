import mongoose, { Types } from "mongoose";
import { Customer } from "../models/Customer.js";
import { Product } from "../models/Product.js";
import { Quote } from "../models/Quote.js";
import type { IQuote } from "../models/Quote.js";
import { getNextSequence } from "./sequence-service.js";
import { createQuoteEvent } from "./quote-event-service.js";

interface CreateQuoteItemInput {
  productId: string;
  quantity: number;
}

interface CreateQuoteInput {
  tenantId: string;
  customerId: string;
  conversationId?: string;
  items: CreateQuoteItemInput[];
  validUntil?: Date;
}

export async function createQuote(
  input: CreateQuoteInput,
): Promise<IQuote> {
  const { tenantId, customerId, conversationId, items, validUntil } = input;

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
        _id: {
          $in: uniqueProductIds,
        },
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

        if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
          throw new Error(`Invalid quantity for product: ${product.name}`);
        }

        const subtotal = product.unitPrice * item.quantity;

        return {
          productId: product._id,
          name: product.name,
          quantity: item.quantity,
          unitPrice: product.unitPrice,
          subtotal,
        };
      });

      const subtotal = quoteItems.reduce(
        (total, item) => total + item.subtotal,
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
            number: quoteNumber,
            items: quoteItems,
            subtotal,
            total: subtotal,
            currency: products[0].currency,
            status: "DRAFT",
            validUntil,
          },
        ],
        {
          session,
        },
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
  validUntil?: Date;
}

export async function updateQuote(
  tenantId: string,
  quoteId: string,
  input: UpdateQuoteInput,
): Promise<IQuote> {
  const { customerId, items, validUntil } = input;

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
        _id: {
          $in: uniqueProductIds,
        },
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

        if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
          throw new Error(`Invalid quantity for product: ${product.name}`);
        }

        const subtotal = product.unitPrice * item.quantity;

        return {
          productId: product._id,
          name: product.name,
          quantity: item.quantity,
          unitPrice: product.unitPrice,
          subtotal,
        };
      });

      const subtotal = quoteItems.reduce(
        (total, item) => total + item.subtotal,
        0,
      );

      quote.customerId = new Types.ObjectId(customerId);
      quote.items = quoteItems;
      quote.subtotal = subtotal;
      quote.total = subtotal;
      quote.currency = products[0].currency;
      quote.validUntil = validUntil ?? undefined;

      await quote.save({
        session,
      });

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
