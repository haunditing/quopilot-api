import mongoose, { Document, Schema } from "mongoose";

export interface IBranding extends Document {
  /** Destino de la marca: app web o landing. */
  target: "app" | "landing";
  logoUrl?: string;
  /** Logo con nombre (imagotipo) para sidebar desplegada. */
  logoWithNameUrl?: string;
  faviconUrl?: string;
  assistantImageUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  brandName?: string;
  fontFamily?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const brandingSchema = new Schema<IBranding>(
  {
    target: {
      type: String,
      enum: ["app", "landing"],
      default: "app",
      index: true,
    },

    logoUrl: {
      type: String,
    },

    logoWithNameUrl: {
      type: String,
    },

    faviconUrl: {
      type: String,
    },

    assistantImageUrl: {
      type: String,
    },

    primaryColor: {
      type: String,
      trim: true,
      match: /^#[0-9a-fA-F]{6}$/,
    },

    secondaryColor: {
      type: String,
      trim: true,
      match: /^#[0-9a-fA-F]{6}$/,
    },

    brandName: {
      type: String,
      trim: true,
    },

    fontFamily: {
      type: String,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Branding = mongoose.model<IBranding>("Branding", brandingSchema);
