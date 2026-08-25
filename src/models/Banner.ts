import mongoose, { Document, Schema } from "mongoose";

export interface IBannerCondition {
  field: "plan" | "status" | "paymentStatus" | "role";
  op: "eq" | "neq" | "in" | "gte" | "lte";
  value: string | number;
  valueList?: Array<string | number>;
}

export interface IBannerProps {
  variant?: string;
  title?: string;
  message: string;
  ctaText?: string;
  ctaUrl?: string;
}

export interface IBanner extends Document {
  slot: string;
  type: string;
  priority: number;
  conditions: IBannerCondition[];
  props: IBannerProps;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const bannerSchema = new Schema<IBanner>(
  {
    slot: { type: String, required: true, trim: true, index: true },
    type: { type: String, required: true }, // AlertBanner | InlineNotice | ModalNotice
    priority: { type: Number, default: 0 },
    conditions: {
      type: [
        {
          field: { type: String, enum: ["plan", "status", "paymentStatus", "role"] },
          op: { type: String, enum: ["eq", "neq", "in", "gte", "lte"] },
          value: { type: Schema.Types.Mixed, required: true },
          valueList: { type: [Schema.Types.Mixed], default: [] },
        },
      ],
      default: [],
    },
    props: {
      variant: { type: String },
      title: { type: String },
      message: { type: String, required: true },
      ctaText: { type: String },
      ctaUrl: { type: String },
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Banner = mongoose.model<IBanner>("Banner", bannerSchema);
