import { Types } from "mongoose";
import { Customer } from "../models/Customer.js";
import { Quote } from "../models/Quote.js";
import { Sale } from "../models/Sale.js";
import { SaleEvent } from "../models/SaleEvent.js";
import { Conversation } from "../models/Conversation.js";

interface GetSalesInput {
  tenantId: string;
  page: number;
  limit: number;
  status?: "CONFIRMED" | "CANCELLED";
  customerId?: string;
  productId?: string;
  search?: string;
  minTotal?: number;
  maxTotal?: number;
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
}

export async function getSales(input: GetSalesInput) {
  const {
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
    userId,
  } = input;

  if (!Types.ObjectId.isValid(tenantId)) {
    throw new Error("Invalid tenantId");
  }

  if (customerId && !Types.ObjectId.isValid(customerId)) {
    throw new Error("Invalid customerId");
  }

  if (productId && !Types.ObjectId.isValid(productId)) {
    throw new Error("Invalid productId");
  }

  const tenantObjectId = new Types.ObjectId(tenantId);

  const filter: Record<string, unknown> = {
    tenantId: tenantObjectId,
  };

  if (userId) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid userId");
    }

    const customerIds = await Conversation.find({
      tenantId: tenantObjectId,
      assignedTo: new Types.ObjectId(userId),
    }).distinct("customerId");

    filter.customerId = { $in: customerIds };
  }

  if (status) {
    filter.status = status;
  }

  if (customerId) {
    filter.customerId = new Types.ObjectId(customerId);
  }

  if (productId) {
    const quoteIds = await Quote.find({
      tenantId: tenantObjectId,
      "items.productId": new Types.ObjectId(productId),
    }).distinct("_id");

    filter.quoteId = {
      $in: quoteIds,
    };
  }

  if (search?.trim()) {
    filter.number = new RegExp(search.trim(), "i");
  }

  const totalFilter: Record<string, number> = {};

  if (minTotal !== undefined) {
    totalFilter.$gte = minTotal;
  }

  if (maxTotal !== undefined) {
    totalFilter.$lte = maxTotal;
  }

  if (Object.keys(totalFilter).length > 0) {
    filter.total = totalFilter;
  }

  const soldAtFilter: Record<string, Date> = {};

  if (dateFrom) {
    soldAtFilter.$gte = new Date(`${dateFrom}T00:00:00.000Z`);
  }

  if (dateTo) {
    soldAtFilter.$lte = new Date(`${dateTo}T23:59:59.999Z`);
  }

  if (Object.keys(soldAtFilter).length > 0) {
    filter.soldAt = soldAtFilter;
  }

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    Sale.find(filter)
      .sort({
        soldAt: -1,
      })
      .skip(skip)
      .limit(limit)
      .lean(),

    Sale.countDocuments(filter),
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

export async function getSaleDetail(tenantId: string, saleId: string) {
  if (!Types.ObjectId.isValid(tenantId)) {
    throw new Error("Invalid tenantId");
  }

  if (!Types.ObjectId.isValid(saleId)) {
    throw new Error("Invalid saleId");
  }

  const tenantObjectId = new Types.ObjectId(tenantId);

  const sale = await Sale.findOne({
    _id: new Types.ObjectId(saleId),
    tenantId: tenantObjectId,
  }).lean();

  if (!sale) {
    throw new Error("Sale not found");
  }

  const [quote, customer, events] = await Promise.all([
    Quote.findOne({
      _id: sale.quoteId,
      tenantId: tenantObjectId,
    }).lean(),

    Customer.findOne({
      _id: sale.customerId,
      tenantId: tenantObjectId,
    }).lean(),

    SaleEvent.find({
      saleId: sale._id,
      tenantId: tenantObjectId,
    })
      .sort({ createdAt: 1 })
      .lean(),
  ]);

  return {
    sale,
    quote,
    customer,
    events,
  };
}
