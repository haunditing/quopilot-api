import { Types } from "mongoose";
import { Customer } from "../models/Customer.js";
import { Conversation } from "../models/Conversation.js";

interface GetCustomersInput {
  tenantId: string;
  page: number;
  limit: number;
  search?: string;
  country?: string;
  userId?: string;
}

export async function getCustomerById(tenantId: string, customerId: string) {
  if (!Types.ObjectId.isValid(tenantId)) {
    throw new Error("Invalid tenantId");
  }

  if (!Types.ObjectId.isValid(customerId)) {
    throw new Error("Invalid customerId");
  }

  const customer = await Customer.findOne({
    _id: new Types.ObjectId(customerId),
    tenantId: new Types.ObjectId(tenantId),
  }).lean();

  if (!customer) {
    throw new Error("Customer not found");
  }

  return customer;
}

export async function getCustomers(input: GetCustomersInput) {
  const { tenantId, page, limit, search, country, userId } = input;

  if (!Types.ObjectId.isValid(tenantId)) {
    throw new Error("Invalid tenantId");
  }

  const tenantObjectId = new Types.ObjectId(tenantId);

  const filter: Record<string, unknown> = {
    tenantId: tenantObjectId,
    isLead: {
      $ne: true,
    },
  };

  if (userId) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid userId");
    }

    const customerIds = await Conversation.find({
      tenantId: tenantObjectId,
      assignedTo: new Types.ObjectId(userId),
    }).distinct("customerId");

    filter._id = { $in: customerIds };
  }

  if (search?.trim()) {
    const searchRegex = new RegExp(search.trim(), "i");

    filter.$or = [
      { name: searchRegex },
      { phone: searchRegex },
      { email: searchRegex },
    ];
  }

  if (country?.trim()) {
    filter.country = new RegExp(`^${country.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  }

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    Customer.find(filter)
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit)
      .lean(),

    Customer.countDocuments(filter),
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
