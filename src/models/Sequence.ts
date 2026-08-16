import mongoose, { Document, Schema, Types } from "mongoose";

export interface ISequence extends Document {
  tenantId: Types.ObjectId;
  key: string;
  value: number;
  createdAt: Date;
  updatedAt: Date;
}

const sequenceSchema = new Schema<ISequence>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },

    key: {
      type: String,
      required: true,
      trim: true,
    },

    value: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

sequenceSchema.index(
  {
    tenantId: 1,
    key: 1,
  },
  {
    unique: true,
  },
);

export const Sequence = mongoose.model<ISequence>("Sequence", sequenceSchema);
