import { Types } from "mongoose";
import { Quote } from "../models/Quote.js";
import { Sale } from "../models/Sale.js";
import { Customer } from "../models/Customer.js";

export async function getAgentDashboardSummary(tenantId: string) {
  if (!Types.ObjectId.isValid(tenantId)) {
    throw new Error("Invalid tenantId");
  }

  const tenantObjectId = new Types.ObjectId(tenantId);

  const [
    totalQuotes,
    pendingQuotes,
    acceptedQuotes,
    totalSales,
    salesAmount,
    totalCustomers,
  ] = await Promise.all([
    Quote.countDocuments({
      tenantId: tenantObjectId,
    }),

    Quote.countDocuments({
      tenantId: tenantObjectId,
      status: {
        $in: ["DRAFT", "SENT", "VIEWED"],
      },
    }),

    Quote.countDocuments({
      tenantId: tenantObjectId,
      status: "ACCEPTED",
    }),

    Sale.countDocuments({
      tenantId: tenantObjectId,
      status: "CONFIRMED",
    }),

    Sale.aggregate([
      {
        $match: {
          tenantId: tenantObjectId,
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

    Customer.countDocuments({
      tenantId: tenantObjectId,
      isLead: {
        $ne: true,
      },
    }),
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
