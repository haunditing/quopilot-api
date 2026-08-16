import mongoose, { Document, Schema } from "mongoose";

export interface ITenant extends Document {
  name: string;
  legalName?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  country?: string;
  currency: string;
  timezone: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt: Date;
  updatedAt: Date;
}

const tenantSchema = new Schema<ITenant>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    legalName: {
      type: String,
      trim: true,
    },

    taxId: {
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

    country: {
      type: String,
      trim: true,
    },

    currency: {
      type: String,
      required: true,
      default: "COP",
    },

    timezone: {
      type: String,
      required: true,
      default: "America/Bogota",
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
  }
);

export const Tenant = mongoose.model<ITenant>("Tenant", tenantSchema);