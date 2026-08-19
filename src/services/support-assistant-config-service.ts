import { SupportAssistantConfig } from "../models/SupportAssistantConfig.js";
import type { AgentToolConfig } from "../models/SupportAssistantConfig.js";

export const SUPPORT_ASSISTANT_ID = "support";

const DEFAULT_SYSTEM_PROMPT = `
Eres el asistente de soporte técnico interno de QuoPilot para este tenant. Tu función es ayudar
a los administradores (TENANT_ADMIN) a resolver problemas, aprender a usar y monitorear su plataforma.

Reglas obligatorias:
1. Solo responde consultas relacionadas con QuoPilot. Si la consulta está fuera
   de ese alcance, responde educadamente que no puedes ayudar con ese tema.
2. Nunca inventes funcionalidades, configuraciones, errores ni procedimientos
   que no estén respaldados por la información que se te proporciona.
3. Si no tienes información suficiente para responder con precisión, indícalo
   claramente y sugiere consultar la documentación o al equipo de desarrollo.
4. Usa los casos de soporte y la documentación (base de conocimiento) como
   fuente principal. No respondas de memoria cuando exista información disponible.
5. Cuando la consulta requiera datos reales del tenant, usa las
   herramientas disponibles (resumen del tenant, cotizaciones, ventas, productos, clientes, canales, configuración del agente, estado del sistema) y responde solo con esos datos reales.
6. Se conciso, claro y en español. Usa listas o pasos numerados cuando sea útil.
`;

const DEFAULT_AGENT_TOOLS: AgentToolConfig[] = [
  { name: "getTenantSummary", enabled: true },
  { name: "getAgentConfig", enabled: true },
  { name: "getSystemStatus", enabled: true },
  { name: "getQuotes", enabled: true, planRequired: ["PRO", "ENTERPRISE"] },
  { name: "getSales", enabled: true, planRequired: ["PRO", "ENTERPRISE"] },
  { name: "getProducts", enabled: true, planRequired: ["STARTER", "PRO", "ENTERPRISE"] },
  { name: "getCustomers", enabled: true, planRequired: ["STARTER", "PRO", "ENTERPRISE"] },
  { name: "getChannels", enabled: true, planRequired: ["PRO", "ENTERPRISE"] },
];

export async function getSupportAssistantConfig(tenantId: string) {
  const config = await SupportAssistantConfig.findOne({ tenantId }).lean();

  if (config) {
    return config;
  }

  return SupportAssistantConfig.create({
    tenantId,
    status: "ACTIVE",
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    caseThreshold: 0.55,
    ragMaxDocs: 3,
    ragMinScore: 0.3,
    memoryWindow: 8,
    maxContextTokens: 6000,
    agentTools: DEFAULT_AGENT_TOOLS,
  }).then((doc) => doc.toObject());
}

export async function updateSupportAssistantConfig(tenantId: string, input: {
  status?: "ACTIVE" | "INACTIVE";
  llm?: {
    provider?: string;
    apiKey?: string;
    model?: string;
    baseUrl?: string;
    maxTokens?: number;
    timeoutMs?: number;
  };
  systemPrompt?: string;
  caseThreshold?: number;
  ragMaxDocs?: number;
  ragMinScore?: number;
  memoryWindow?: number;
  maxContextTokens?: number;
  agentTools?: AgentToolConfig[];
}) {
  const existing = await getSupportAssistantConfig(tenantId);

  const config = await SupportAssistantConfig.findByIdAndUpdate(
    existing._id,
    {
      $set: input,
    },
    {
      returnDocument: "after",
      runValidators: true,
    },
  ).lean();

  return config;
}