import { Types } from "mongoose";
import { Quote } from "../models/Quote.js";
import { Sale } from "../models/Sale.js";
import { Customer } from "../models/Customer.js";
import { Conversation } from "../models/Conversation.js";

export async function getAgentDashboardSummary(tenantId: string, userId?: string) {
  if (!Types.ObjectId.isValid(tenantId)) {
    throw new Error("Invalid tenantId");
  }

  const tenantObjectId = new Types.ObjectId(tenantId);
  const userObjectId =
    userId && Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : null;

  let customerIds: Types.ObjectId[] = [];
  if (userObjectId) {
    customerIds = await Conversation.find({
      tenantId: tenantObjectId,
      assignedTo: userObjectId,
    }).distinct("customerId");
  }

  const customerMatch = userObjectId
    ? { tenantId: tenantObjectId, customerId: { $in: customerIds } }
    : { tenantId: tenantObjectId };

  const customerDocMatch = userObjectId
    ? {
        tenantId: tenantObjectId,
        _id: { $in: customerIds },
        isLead: { $ne: true },
      }
    : { tenantId: tenantObjectId, isLead: { $ne: true } };

  const [
    totalQuotes,
    pendingQuotes,
    acceptedQuotes,
    totalSales,
    salesAmount,
    totalCustomers,
  ] = await Promise.all([
    Quote.countDocuments(customerMatch),

    Quote.countDocuments({
      ...customerMatch,
      status: {
        $in: ["DRAFT", "SENT", "VIEWED"],
      },
    }),

    Quote.countDocuments({
      ...customerMatch,
      status: "ACCEPTED",
    }),

    Sale.countDocuments({
      ...customerMatch,
      status: "CONFIRMED",
    }),

    Sale.aggregate([
      {
        $match: {
          ...customerMatch,
          status: "CONFIRMED",
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$total",
          },
        },
      },
    ]),

    Customer.countDocuments(customerDocMatch),
  ]);

  const amount = salesAmount.length > 0 ? salesAmount[0].total : 0;

  const conversionRate =
    totalQuotes > 0
      ? Number(((acceptedQuotes / totalQuotes) * 100).toFixed(2))
      : 0;

  return {
    quotes: {
      total: totalQuotes,
      pending: pendingQuotes,
      accepted: acceptedQuotes,
    },

    sales: {
      total: totalSales,
      amount,
    },

    customers: {
      total: totalCustomers,
    },

    conversionRate,
  };
}
