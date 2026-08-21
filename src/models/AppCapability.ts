import mongoose, { Document, Schema } from "mongoose";

export type CapabilityDependencyType = "OBLIGATORIA" | "OPCIONAL";

export type CapabilityStatus = "ACTIVE" | "POR_CONFIRMAR";

export type CapabilityKind =
  | "VISUALIZACION"
  | "BUSQUEDA"
  | "CONSULTA"
  | "CREACION"
  | "EDICION"
  | "ELIMINACION"
  | "CAMBIO_ESTADO"
  | "OPERACION_COMERCIAL"
  | "DOCUMENTO"
  | "COMUNICACION"
  | "CONFIGURACION"
  | "ANALISIS"
  | "IA"
  | "TECNICA"
  | "ADMINISTRACION"
  | "SEGURIDAD"
  | "AUTENTICACION";

export interface ICapabilityDependency {
  code: string;
  type: CapabilityDependencyType;
}

export interface IAppCapability extends Document {
  module: string;
  code: string;
  name: string;
  description: string;
  kind: CapabilityKind;
  configurableByPlan: boolean;
  nonConfigurableReason?: string;
  domain?: "COMMERCIAL" | "ADMINISTRATION" | "SUPER_ADMIN";
  allowedRoles?: string[];
  includedInPlans?: string[];
  dependencies: ICapabilityDependency[];
  evidence: string;
  status: CapabilityStatus;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const capabilityDependencySchema = new Schema<ICapabilityDependency>(
  {
    code: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["OBLIGATORIA", "OPCIONAL"],
      required: true,
    },
  },
  { _id: false },
);

const appCapabilitySchema = new Schema<IAppCapability>(
  {
    module: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    kind: {
      type: String,
      enum: [
        "VISUALIZACION",
        "BUSQUEDA",
        "CONSULTA",
        "CREACION",
        "EDICION",
        "ELIMINACION",
        "CAMBIO_ESTADO",
        "OPERACION_COMERCIAL",
        "DOCUMENTO",
        "COMUNICACION",
        "CONFIGURACION",
        "ANALISIS",
        "IA",
        "TECNICA",
        "ADMINISTRACION",
        "SEGURIDAD",
        "AUTENTICACION",
      ],
      required: true,
    },

    configurableByPlan: {
      type: Boolean,
      default: true,
    },

    domain: {
      type: String,
      enum: ["COMMERCIAL", "ADMINISTRATION", "SUPER_ADMIN"],
      default: "ADMINISTRATION",
      index: true,
    },

    allowedRoles: {
      type: [String],
      default: [],
    },

    includedInPlans: {
      type: [String],
      default: [],
    },

    nonConfigurableReason: {
      type: String,
      default: "",
      trim: true,
    },

    dependencies: {
      type: [capabilityDependencySchema],
      default: [],
    },

    evidence: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "POR_CONFIRMAR"],
      default: "ACTIVE",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

appCapabilitySchema.index({ module: 1, sortOrder: 1 });
appCapabilitySchema.index({ configurableByPlan: 1, module: 1 });

export const AppCapability = mongoose.model<IAppCapability>(
  "AppCapability",
  appCapabilitySchema,
);