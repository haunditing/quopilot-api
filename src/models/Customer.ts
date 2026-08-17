import mongoose, { Document, Schema, Types } from "mongoose";

export type CustomerType = "CUSTOMER" | "SUPPLIER";

export type IdentificationType =
  | "CC"
  | "CE"
  | "NIT"
  | "PASSPORT"
  | "OTHER";

export interface ICustomer extends Document {
  tenantId: Types.ObjectId;
  name?: string;
  customerType?: CustomerType;
  firstName?: string;
  lastName?: string;
  identificationType?: IdentificationType;
  identificationNumber?: string;
  municipality?: string;
  department?: string;
  address?: string;
  postalCode?: string;
  email?: string;
  email2?: string;
  phone?: string;
  phone2?: string;
  sendStatement?: boolean;
  whatsappId?: string;
  instagramId?: string;
  company?: string;
  country?: string;
  isLead?: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    name: {
      type: String,
      trim: true,
    },

    customerType: {
      type: String,
      enum: ["CUSTOMER", "SUPPLIER"],
      default: "CUSTOMER",
    },

    firstName: {
      type: String,
      trim: true,
    },

    lastName: {
      type: String,
      trim: true,
    },

    identificationType: {
      type: String,
      enum: ["CC", "CE", "NIT", "PASSPORT", "OTHER"],
    },

    identificationNumber: {
      type: String,
      trim: true,
    },

    municipality: {
      type: String,
      trim: true,
    },

    department: {
      type: String,
      trim: true,
    },

    address: {
      type: String,
      trim: true,
    },

    postalCode: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    email2: {
      type: String,
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    phone2: {
      type: String,
      trim: true,
    },

    sendStatement: {
      type: Boolean,
      default: false,
    },

    whatsappId: {
      type: String,
      trim: true,
    },

    instagramId: {
      type: String,
      trim: true,
    },

    company: {
      type: String,
      trim: true,
    },

    country: {
      type: String,
      trim: true,
    },

    isLead: {
      type: Boolean,
      default: false,
      index: true,
    },

    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  },
);

customerSchema.index({
  tenantId: 1,
  whatsappId: 1,
});

customerSchema.index({
  tenantId: 1,
  instagramId: 1,
});

customerSchema.index({
  tenantId: 1,
  email: 1,
});

export const Customer = mongoose.model<ICustomer>("Customer", customerSchema);
