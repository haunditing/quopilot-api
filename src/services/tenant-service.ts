import bcrypt from "bcrypt";
import { Types } from "mongoose";
import { Tenant } from "../models/Tenant.js";
import { User } from "../models/User.js";
import type {
  CreateTenantInput,
  UpdateTenantInput,
  UpdateTenantStatusInput,
} from "../schemas/tenant-schema.js";

interface GetTenantsInput {
  page: number;
  limit: number;
  search?: string;
  status?: string;
}

function assertValidTenantId(tenantId: string): void {
  if (!Types.ObjectId.isValid(tenantId)) {
    throw new Error("Invalid tenantId");
  }
}

export async function getTenants(input: GetTenantsInput) {
  const { page, limit, search, status } = input;

  const filter: Record<string, unknown> = {};

  if (search?.trim()) {
    const searchRegex = new RegExp(search.trim(), "i");

    filter.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { taxId: searchRegex },
    ];
  }

  if (status) {
    filter.status = status;
  }

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    Tenant.find(filter)
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit)
      .lean(),

    Tenant.countDocuments(filter),
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

export async function getTenantById(tenantId: string) {
  assertValidTenantId(tenantId);

  const tenant = await Tenant.findById(tenantId).lean();

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  return tenant;
}

export async function createTenant(input: CreateTenantInput) {
  const existingUser = await User.findOne({
    email: input.email.toLowerCase(),
  });

  if (existingUser) {
    throw new Error("A user with this email already exists");
  }

  const tenant = await Tenant.create({
    name: input.name,
    legalName: input.legalName,
    taxId: input.taxId,
    email: input.email,
    phone: input.phone,
    country: input.country,
    currency: input.currency,
    timezone: input.timezone,
  });

  const passwordHash = await bcrypt.hash(input.password, 10);

  await User.create({
    tenantId: tenant._id,
    name: input.adminName,
    email: input.email.toLowerCase(),
    passwordHash,
    role: "TENANT_ADMIN",
    status: "ACTIVE",
    mustChangePassword: true,
  });

  return tenant.toObject();
}

export async function updateTenant(
  tenantId: string,
  input: UpdateTenantInput,
) {
  assertValidTenantId(tenantId);

  const tenant = await Tenant.findByIdAndUpdate(tenantId, input, {
    returnDocument: "after",
    runValidators: true,
  }).lean();

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  return tenant;
}

export async function updateTenantStatus(
  tenantId: string,
  status: UpdateTenantStatusInput["status"],
) {
  assertValidTenantId(tenantId);

  const tenant = await Tenant.findByIdAndUpdate(
    tenantId,
    {
      status,
    },
    {
      new: true,
      runValidators: true,
    },
  ).lean();

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  return tenant;
}
