import mongoose, { Document, Schema, Types } from "mongoose";

export interface ICustomer extends Document {
  tenantId: Types.ObjectId;
  name?: string;
  email?: string;
  phone?: string;
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

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      trim: true,
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
