import { Types } from "mongoose";
import { Quote } from "../models/Quote.js";
import { Sale } from "../models/Sale.js";
import { Customer } from "../models/Customer.js";
import { Product } from "../models/Product.js";
import { User } from "../models/User.js";

export async function getTenantDashboardSummary(tenantId: string) {
  if (!Types.ObjectId.isValid(tenantId)) {
    throw new Error("Invalid tenantId");
  }

  const tenantObjectId = new Types.ObjectId(tenantId);

  const [
    totalQuotes,
    sentQuotes,
    acceptedQuotes,
    totalSales,
    salesAmount,
    totalCustomers,
    totalProducts,
    totalAgents,
  ] = await Promise.all([
    Quote.countDocuments({
      tenantId: tenantObjectId,
    }),

    Quote.countDocuments({
      tenantId: tenantObjectId,
      status: {
        $in: ["SENT", "VIEWED", "ACCEPTED", "REJECTED", "EXPIRED"],
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

    Product.countDocuments({
      tenantId: tenantObjectId,
    }),

    User.countDocuments({
      tenantId: tenantObjectId,
      role: "AGENT",
      status: "ACTIVE",
    }),
  ]);

  const amount = salesAmount.length > 0 ? salesAmount[0].total : 0;

  const conversionRate =
    sentQuotes > 0
      ? Number(((acceptedQuotes / sentQuotes) * 100).toFixed(2))
      : 0;

  return {
    quotes: {
      total: totalQuotes,
      sent: sentQuotes,
      accepted: acceptedQuotes,
    },

    sales: {
      total: totalSales,
      amount,
    },

    customers: {
      total: totalCustomers,
    },

    products: {
      total: totalProducts,
    },

    agents: {
      total: totalAgents,
    },

    conversionRate,
  };
}
