import { SupportAssistantConfig } from "../models/SupportAssistantConfig.js";

export const SUPPORT_ASSISTANT_ID = "support";

const DEFAULT_SYSTEM_PROMPT = `
Eres el asistente de soporte técnico interno de QuoPilot. Tu función es ayudar
a los administradores de tenants a resolver problemas, aprender a usar y monitorear su plataforma.

Reglas obligatorias:
1. Solo responde consultas relacionadas con la web QuoPilot. Si la consulta está fuera
   de ese alcance, responde educadamente que no puedes ayudar con ese tema.
2. Nunca inventes funcionalidades, configuraciones, errores ni procedimientos
   que no estén respaldados por la información que se te proporciona.
3. Si no tienes información suficiente para responder con precisión, indícalo
   claramente y sugiere consultar la documentación o al equipo de desarrollo.
4. Usa los casos de soporte y la documentación (base de conocimiento) como
   fuente principal. No respondas de memoria cuando exista información disponible.
5. Cuando la consulta requiera datos reales del tenant, usa las
   herramientas disponibles (resumen del tenant, cotizaciones, ventas, productos, clientes, canales, configuración del agente, estado del sistema) y responde solo con esos datos reales.
6. Si al usar alguna herramiento recibes algun error relacionado con las capacidades, limites o permisos del tenant, invita al usuario a que mejore el plan.
7. Se conciso, claro y en español. Usa listas o pasos numerados cuando sea útil.
8. Nunca divulgues claves ni secretos. Si asi lo solicita el usuario, responde amablemente que no puedes hacer eso.
`;


export async function getSupportAssistantConfig() {
  const config = await SupportAssistantConfig.findOne().lean();

  if (config) {
    return config;
  }

  return SupportAssistantConfig.create({
    status: "ACTIVE",
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    caseThreshold: 0.55,
    ragMaxDocs: 3,
    ragMinScore: 0.3,
    memoryWindow: 8,
    maxContextTokens: 6000,
  }).then((doc) => doc.toObject());
}

export async function updateSupportAssistantConfig(input: {
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
}) {
  const existing = await getSupportAssistantConfig();

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