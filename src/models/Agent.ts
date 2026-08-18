import mongoose, { Document, Schema, Types } from "mongoose";

export type AgentStatus = "ACTIVE" | "INACTIVE";

export type AgentTone =
  | "PROFESSIONAL"
  | "FRIENDLY"
  | "FORMAL"
  | "CASUAL"
  | "EMPATHETIC";

export type AgentTool =
  | "PRODUCT_SEARCH"
  | "PRODUCT_DETAILS"
  | "CUSTOMER_LOOKUP"
  | "CUSTOMER_UPDATE"
  | "CUSTOMER_HISTORY"
  | "QUOTE_HISTORY"
  | "QUOTE_DETAILS"
  | "QUOTE_DRAFT"
  | "QUOTE_UPDATE"
  | "QUOTE_ACCEPT"
  | "SALES_HISTORY"
  | "HUMAN_HANDOFF";

export type AgentProductScope = "ALL" | "SELECTED";

export interface IAgentEscalation {
  enabled: boolean;
  keywords: string[];
  fallbackMessage?: string;
}

export interface IAgentLLMConfig {
  provider?: "openai" | "google" | "openrouter" | "custom";
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface IAgentMemory {
  enabled: boolean;
  messageWindow: number;
  maxContextTokens: number;
  summarizationEnabled: boolean;
}

export interface IAgent extends Document {
  tenantId: Types.ObjectId;

  name: string;
  avatarData?: string;
  description?: string;
  personality?: string;
  systemInstructions?: string;
  language: string;
  tone: AgentTone;
  commercialObjective?: string;
  welcomeMessage?: string;
  behaviorRules: string[];

  productScope: AgentProductScope;
  allowedProductIds: Types.ObjectId[];

  enabledTools: AgentTool[];
  status: AgentStatus;

  escalation: IAgentEscalation;
  memory: IAgentMemory;
  llm?: IAgentLLMConfig;

  createdAt: Date;
  updatedAt: Date;
}

const agentEscalationSchema = new Schema<IAgentEscalation>(
  {
    enabled: {
      type: Boolean,
      default: true,
    },

    keywords: {
      type: [String],
      default: [
        "hablar con un humano",
        "hablar con un asesor",
        "agente humano",
        "asesor humano",
        "representante",
        "atención al cliente",
        "un humano",
      ],
    },

    fallbackMessage: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const agentMemorySchema = new Schema<IAgentMemory>(
  {
    enabled: {
      type: Boolean,
      default: true,
    },

    messageWindow: {
      type: Number,
      default: 30,
      min: 1,
    },

    maxContextTokens: {
      type: Number,
      default: 12000,
      min: 1000,
    },

    summarizationEnabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    _id: false,
  },
);

const agentLLMConfigSchema = new Schema<IAgentLLMConfig>(
  {
    apiKey: {
      type: String,
      trim: true,
    },

    model: {
      type: String,
      trim: true,
    },

    baseUrl: {
      type: String,
      trim: true,
    },

    maxTokens: {
      type: Number,
      min: 1,
    },

    timeoutMs: {
      type: Number,
      min: 1000,
    },
  },
  {
    _id: false,
  },
);

const agentSchema = new Schema<IAgent>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    avatarData: {
      type: String,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    personality: {
      type: String,
      trim: true,
    },

    systemInstructions: {
      type: String,
      trim: true,
    },

    language: {
      type: String,
      default: "es",
      trim: true,
    },

    tone: {
      type: String,
      enum: [
        "PROFESSIONAL",
        "FRIENDLY",
        "FORMAL",
        "CASUAL",
        "EMPATHETIC",
      ],
      default: "PROFESSIONAL",
    },

    commercialObjective: {
      type: String,
      trim: true,
    },

    welcomeMessage: {
      type: String,
      trim: true,
    },

    behaviorRules: {
      type: [String],
      default: [],
    },

    productScope: {
      type: String,
      enum: ["ALL", "SELECTED"],
      default: "ALL",
    },

    allowedProductIds: {
      type: [Schema.Types.ObjectId],
      ref: "Product",
      default: [],
    },

    enabledTools: {
      type: [String],
      enum: [
        "PRODUCT_SEARCH",
        "PRODUCT_DETAILS",
        "CUSTOMER_LOOKUP",
        "CUSTOMER_UPDATE",
        "CUSTOMER_HISTORY",
        "QUOTE_HISTORY",
        "QUOTE_DETAILS",
        "QUOTE_DRAFT",
        "QUOTE_UPDATE",
        "QUOTE_ACCEPT",
        "SALES_HISTORY",
        "HUMAN_HANDOFF",
      ],
      default: [],
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },

    escalation: {
      type: agentEscalationSchema,
      default: () => ({}),
    },

    memory: {
      type: agentMemorySchema,
      default: () => ({}),
    },

    llm: {
      type: agentLLMConfigSchema,
      default: undefined,
    },
  },
  {
    timestamps: true,
  },
);

agentSchema.index(
  {
    tenantId: 1,
  },
  {
    unique: true,
  },
);

export const Agent = mongoose.model<IAgent>("Agent", agentSchema);
