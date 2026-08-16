import { Types } from "mongoose";
import { Customer } from "../models/Customer.js";
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
} from "../schemas/customer-schema.js";

function assertValidId(id: string, field = "id"): void {
  if (!Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ${field}`);
  }
}

export async function createCustomer(
  input: CreateCustomerInput,
  tenantId: string,
) {
  const customer = await Customer.create({
    tenantId,
    name: input.name,
    email: input.email,
    phone: input.phone,
    whatsappId: input.whatsappId,
    country: input.country,
  });

  return customer.toObject();
}

export async function updateCustomer(
  tenantId: string,
  customerId: string,
  input: UpdateCustomerInput,
) {
  assertValidId(tenantId, "tenantId");
  assertValidId(customerId, "customerId");

  const update: Record<string, unknown> = {};

  if (input.name !== undefined) {
    update.name = input.name;
  }

  if (input.email !== undefined) {
    update.email = input.email;
  }

  if (input.phone !== undefined) {
    update.phone = input.phone;
  }

  if (input.whatsappId !== undefined) {
    update.whatsappId = input.whatsappId;
  }

  if (input.country !== undefined) {
    update.country = input.country;
  }

  const customer = await Customer.findOneAndUpdate(
    {
      _id: new Types.ObjectId(customerId),
      tenantId: new Types.ObjectId(tenantId),
    },
    update,
    {
      new: true,
      runValidators: true,
    },
  ).lean();

  if (!customer) {
    throw new Error("Customer not found");
  }

  return customer;
}

export async function deleteCustomer(tenantId: string, customerId: string) {
  assertValidId(tenantId, "tenantId");
  assertValidId(customerId, "customerId");

  const customer = await Customer.findOneAndDelete({
    _id: new Types.ObjectId(customerId),
    tenantId: new Types.ObjectId(tenantId),
  });

  if (!customer) {
    throw new Error("Customer not found");
  }

  return {
    id: customerId,
  };
}
