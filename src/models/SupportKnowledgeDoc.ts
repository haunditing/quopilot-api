import mongoose, { Document, Schema } from "mongoose";

export interface ISupportKnowledgeDoc extends Document {
  title: string;
  module: string;
  summary: string;
  content: string;
  keywords: string[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const supportKnowledgeDocSchema = new Schema<ISupportKnowledgeDoc>(
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

    summary: {
      type: String,
      default: "",
      trim: true,
    },

    content: {
      type: String,
      required: true,
    },

    keywords: {
      type: [String],
      default: [],
    },

    enabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

supportKnowledgeDocSchema.index({
  title: "text",
  summary: "text",
  content: "text",
  keywords: "text",
});

export const SupportKnowledgeDoc = mongoose.model<ISupportKnowledgeDoc>(
  "SupportKnowledgeDoc",
  supportKnowledgeDocSchema,
);