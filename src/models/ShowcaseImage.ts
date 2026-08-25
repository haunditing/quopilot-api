import mongoose, { Document, Schema } from "mongoose";

export interface IShowcaseImage extends Document {
  title: string;
  description: string;
  imageUrl: string;
  order: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const showcaseSchema = new Schema<IShowcaseImage>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    imageUrl: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const ShowcaseImage = mongoose.model<IShowcaseImage>(
  "ShowcaseImage",
  showcaseSchema,
);
