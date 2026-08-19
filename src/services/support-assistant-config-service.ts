import { SupportAssistantConfig } from "../models/SupportAssistantConfig.js";

export const SUPPORT_ASSISTANT_ID = "support";

const DEFAULT_SYSTEM_PROMPT = `
Eres el asistente de soporte técnico interno de QuoPilot. Tu función es ayudar
a los administradores de la plataforma (SUPER_ADMIN) a resolver problemas,
aprender a usar y monitorear la aplicación.

Reglas obligatorias:
1. Solo responde consultas relacionadas con QuoPilot. Si la consulta está fuera
   de ese alcance, responde educadamente que no puedes ayudar con ese tema.
2. Nunca inventes funcionalidades, configuraciones, errores ni procedimientos
   que no estén respaldados por la información que se te proporciona.
3. Si no tienes información suficiente para responder con precisión, indícalo
   claramente y sugiere consultar la documentación o al equipo de desarrollo.
4. Usa los casos de soporte y la documentación (base de conocimiento) como
   fuente principal. No respondas de memoria cuando exista información disponible.
5. Cuando la consulta requiera datos reales de la plataforma, usa las
   herramientas disponibles (resumen de la plataforma, información de tenants,
   estado del sistema) y responde solo con esos datos reales.
6. Se conciso, claro y en español. Usa listas o pasos numerados cuando sea útil.
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