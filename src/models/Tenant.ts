import mongoose, { Document, Schema } from "mongoose";

export interface ITenant extends Document {
  name: string;
  legalName?: string;
  taxId?: string;
  personType?: string;
  taxLiability?: string;
  taxRegime?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  department?: string;
  postalCode?: string;
  website?: string;
  country?: string;
  currency: string;
  timezone: string;
  decimalPrecision?: number;
  thousandsSeparator?: string;
  decimalSeparator?: string;
  logoUrl?: string;
  documentLogoUrl?: string;
  brandColor?: string;
  footerText?: string;
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

    personType: {
      type: String,
      trim: true,
    },

    taxLiability: {
      type: String,
      trim: true,
    },

    taxRegime: {
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

    address: {
      type: String,
      trim: true,
    },

    city: {
      type: String,
      trim: true,
    },

    department: {
      type: String,
      trim: true,
    },

    postalCode: {
      type: String,
      trim: true,
    },

    website: {
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

    decimalPrecision: {
      type: Number,
      min: 0,
      max: 6,
    },

    thousandsSeparator: {
      type: String,
      trim: true,
    },

    decimalSeparator: {
      type: String,
      trim: true,
    },

    logoUrl: {
      type: String,
      trim: true,
    },

    documentLogoUrl: {
      type: String,
      trim: true,
    },

    brandColor: {
      type: String,
      trim: true,
    },

    footerText: {
      type: String,
      trim: true,
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