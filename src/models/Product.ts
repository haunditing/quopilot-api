import mongoose, { Document, Schema, Types } from "mongoose";

export type ProductStatus = "ACTIVE" | "INACTIVE";

export type ItemType = "PRODUCT" | "SERVICE" | "COMBO";

export type UnitOfMeasure =
  | "UNIT"
  | "KG"
  | "LB"
  | "LITER"
  | "METER"
  | "HOUR"
  | "PACKAGE"
  | "BOX"
  | "SET";

export interface PriceListEntry {
  priceListId: string;
  priceListName: string;
  price: number;
}

export interface CustomField {
  fieldId: string;
  name: string;
  value: string;
}

export interface ProductImage {
  url: string;
  publicId?: string;
  filename?: string;
}

export interface IProduct extends Document {
  tenantId: Types.ObjectId;
  itemType: ItemType;
  name: string;
  reference?: string;
  description?: string;
  category?: string;
  unitOfMeasure?: UnitOfMeasure;
  code?: string;
  sku?: string;
  basePrice: number;
  taxRate: number;
  unitPrice: number;
  currency: string;
  status: ProductStatus;
  priceLists?: PriceListEntry[];
  customFields?: CustomField[];
  accountingAccount?: string;
  image?: ProductImage;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const priceListEntrySchema = new Schema<PriceListEntry>(
  {
    priceListId: {
      type: String,
      required: true,
    },
    priceListName: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const customFieldSchema = new Schema<CustomField>(
  {
    fieldId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    value: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);

const productImageSchema = new Schema<ProductImage>(
  {
    url: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
    },
    filename: {
      type: String,
    },
  },
  { _id: false },
);

const productSchema = new Schema<IProduct>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    itemType: {
      type: String,
      enum: ["PRODUCT", "SERVICE", "COMBO"],
      default: "PRODUCT",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    reference: {
      type: String,
      trim: true,
      uppercase: true,
    },

    description: {
      type: String,
      trim: true,
    },

    category: {
      type: String,
      trim: true,
    },

    unitOfMeasure: {
      type: String,
      enum: [
        "UNIT",
        "KG",
        "LB",
        "LITER",
        "METER",
        "HOUR",
        "PACKAGE",
        "BOX",
        "SET",
      ],
    },

    code: {
      type: String,
      trim: true,
      uppercase: true,
    },

    sku: {
      type: String,
      trim: true,
      uppercase: true,
    },

    basePrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    taxRate: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    currency: {
      type: String,
      required: true,
      default: "COP",
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },

    priceLists: {
      type: [priceListEntrySchema],
      default: [],
    },

    customFields: {
      type: [customFieldSchema],
      default: [],
    },

    accountingAccount: {
      type: String,
      trim: true,
    },

    image: {
      type: productImageSchema,
    },

    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  },
);

productSchema.index({
  tenantId: 1,
  sku: 1,
});

productSchema.index({
  tenantId: 1,
  status: 1,
});

productSchema.index({
  tenantId: 1,
  itemType: 1,
});

productSchema.index({
  tenantId: 1,
  category: 1,
});

export const Product = mongoose.model<IProduct>("Product", productSchema);
