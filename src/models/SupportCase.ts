import mongoose, { Document, Schema } from "mongoose";

export type SupportCaseStatus = "RESOLVED" | "VERIFIED";

export interface ISupportCase extends Document {
  title: string;
  module: string;
  problem: string;
  solution: string;
  keywords: string[];
  status: SupportCaseStatus;
  confirmedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const supportCaseSchema = new Schema<ISupportCase>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    module: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    problem: {
      type: String,
      required: true,
    },

    solution: {
      type: String,
      required: true,
    },

    keywords: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: ["RESOLVED", "VERIFIED"],
      default: "RESOLVED",
    },

    confirmedCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

supportCaseSchema.index({
  title: "text",
  problem: "text",
  solution: "text",
  keywords: "text",
});

export const SupportCase = mongoose.model<ISupportCase>(
  "SupportCase",
  supportCaseSchema,
);