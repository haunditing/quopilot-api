import { User } from "../models/User.js";
import { Tenant } from "../models/Tenant.js";
import { Quote } from "../models/Quote.js";
import { Sale } from "../models/Sale.js";

export async function getSuperAdminDashboardSummary() {
  const [
    totalTenants,
    activeTenants,
    totalUsers,
    totalQuotes,
    totalSales,
    salesAmount,
  ] = await Promise.all([
    Tenant.countDocuments(),

    Tenant.countDocuments({
      status: "ACTIVE",
    }),

    User.countDocuments(),

    Quote.countDocuments(),

    Sale.countDocuments({
      status: "CONFIRMED",
    }),

    Sale.aggregate([
      {
        $match: {
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
  ]);

  const amount = salesAmount.length > 0 ? salesAmount[0].total : 0;

  return {
    tenants: {
      total: totalTenants,
      active: activeTenants,
    },

    users: {
      total: totalUsers,
    },

    sales: {
      total: totalSales,
      amount,
    },

    quotes: {
      total: totalQuotes,
    },
  };
}
