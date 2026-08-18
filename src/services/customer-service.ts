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
    customerType: input.customerType,
    firstName: input.firstName,
    lastName: input.lastName,
    identificationType: input.identificationType,
    identificationNumber: input.identificationNumber,
    municipality: input.municipality,
    department: input.department,
    address: input.address,
    postalCode: input.postalCode,
    email: input.email,
    email2: input.email2,
    phone: input.phone,
    phone2: input.phone2,
    sendStatement: input.sendStatement,
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

  if (input.customerType !== undefined) {
    update.customerType = input.customerType;
  }

  if (input.firstName !== undefined) {
    update.firstName = input.firstName;
  }

  if (input.lastName !== undefined) {
    update.lastName = input.lastName;
  }

  if (input.identificationType !== undefined) {
    update.identificationType = input.identificationType;
  }

  if (input.identificationNumber !== undefined) {
    update.identificationNumber = input.identificationNumber;
  }

  if (input.municipality !== undefined) {
    update.municipality = input.municipality;
  }

  if (input.department !== undefined) {
    update.department = input.department;
  }

  if (input.address !== undefined) {
    update.address = input.address;
  }

  if (input.postalCode !== undefined) {
    update.postalCode = input.postalCode;
  }

  if (input.email !== undefined) {
    update.email = input.email;
  }

  if (input.email2 !== undefined) {
    update.email2 = input.email2;
  }

  if (input.phone !== undefined) {
    update.phone = input.phone;
  }

  if (input.phone2 !== undefined) {
    update.phone2 = input.phone2;
  }

  if (input.sendStatement !== undefined) {
    update.sendStatement = input.sendStatement;
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
      returnDocument: "after",
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
