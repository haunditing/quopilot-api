import "dotenv/config";
import mongoose from "mongoose";
import { Plan } from "../src/models/Plan.js";
import { AssistantPlanCapabilities } from "../src/models/AssistantPlanCapabilities.js";
import env from "../src/config/env.js";

const DEFAULT_PLANS = [
  {
    key: "FREE",
    name: "Free",
    description: "Plan gratuito con funcionalidades básicas",
    isActive: true,
    isDefault: true,
    sortOrder: 1,
    features: [
      { key: "dashboard", label: "Dashboard", description: "Panel principal de métricas", enabled: true },
      { key: "customers", label: "Clientes", description: "Gestión de clientes", enabled: true },
      { key: "products", label: "Productos", description: "Catálogo de productos", enabled: true },
      { key: "quotes", label: "Cotizaciones", description: "Creación y gestión de cotizaciones", enabled: true },
      { key: "sales", label: "Ventas", description: "Registro y seguimiento de ventas", enabled: false },
      { key: "channels", label: "Canales", description: "Canales de comunicación (WhatsApp, etc.)", enabled: false },
      { key: "agent", label: "Agente IA", description: "Configuración del agente comercial", enabled: false },
      { key: "reports", label: "Reportes", description: "Reportes básicos", enabled: false },
      { key: "integrations", label: "Integraciones", description: "API e integraciones externas", enabled: false },
      { key: "settings", label: "Configuración", description: "Configuración del tenant", enabled: true },
    ],
  },
  {
    key: "STARTER",
    name: "Starter",
    description: "Plan inicial para equipos pequeños",
    isActive: true,
    isDefault: false,
    sortOrder: 2,
    features: [
      { key: "dashboard", label: "Dashboard", description: "Panel principal de métricas", enabled: true },
      { key: "customers", label: "Clientes", description: "Gestión completa de clientes", enabled: true },
      { key: "products", label: "Productos", description: "Catálogo completo de productos", enabled: true },
      { key: "quotes", label: "Cotizaciones", description: "Creación y gestión de cotizaciones", enabled: true },
      { key: "sales", label: "Ventas", description: "Registro y seguimiento de ventas", enabled: true },
      { key: "channels", label: "Canales", description: "Canales de comunicación (WhatsApp, Web Chat)", enabled: true },
      { key: "agent", label: "Agente IA", description: "Configuración del agente comercial", enabled: true },
      { key: "reports", label: "Reportes", description: "Reportes básicos", enabled: true },
      { key: "integrations", label: "Integraciones", description: "API e integraciones externas", enabled: false },
      { key: "settings", label: "Configuración", description: "Configuración completa del tenant", enabled: true },
    ],
  },
  {
    key: "PRO",
    name: "Pro",
    description: "Plan profesional para equipos en crecimiento",
    isActive: true,
    isDefault: false,
    sortOrder: 3,
    features: [
      { key: "dashboard", label: "Dashboard", description: "Panel avanzado de métricas", enabled: true },
      { key: "customers", label: "Clientes", description: "Gestión avanzada de clientes", enabled: true },
      { key: "products", label: "Productos", description: "Catálogo avanzado con variantes", enabled: true },
      { key: "quotes", label: "Cotizaciones", description: "Gestión completa de cotizaciones", enabled: true },
      { key: "sales", label: "Ventas", description: "Pipeline de ventas completo", enabled: true },
      { key: "channels", label: "Canales", description: "Todos los canales (WhatsApp, Instagram, Web)", enabled: true },
      { key: "agent", label: "Agente IA", description: "Configuración avanzada del agente", enabled: true },
      { key: "reports", label: "Reportes", description: "Reportes avanzados y personalizados", enabled: true },
      { key: "integrations", label: "Integraciones", description: "API completa e integraciones", enabled: true },
      { key: "settings", label: "Configuración", description: "Configuración completa", enabled: true },
    ],
  },
  {
    key: "ENTERPRISE",
    name: "Enterprise",
    description: "Plan empresarial con funcionalidades completas",
    isActive: true,
    isDefault: false,
    sortOrder: 4,
    features: [
      { key: "dashboard", label: "Dashboard", description: "Dashboard ejecutivo completo", enabled: true },
      { key: "customers", label: "Clientes", description: "CRM completo con segmentación", enabled: true },
      { key: "products", label: "Productos", description: "Catálogo empresarial con variantes y bundles", enabled: true },
      { key: "quotes", label: "Cotizaciones", description: "Motor de cotizaciones empresarial", enabled: true },
      { key: "sales", label: "Ventas", description: "Pipeline multi-equipo con automatizaciones", enabled: true },
      { key: "channels", label: "Canales", description: "Omnicanal completo (WhatsApp, Instagram, Web, Email)", enabled: true },
      { key: "agent", label: "Agente IA", description: "Agente IA empresarial con entrenamiento", enabled: true },
      { key: "reports", label: "Reportes", description: "BI y reportes personalizados", enabled: true },
      { key: "integrations", label: "Integraciones", description: "API completa, webhooks, SSO", enabled: true },
      { key: "settings", label: "Configuración", description: "Configuración empresarial completa", enabled: true },
    ],
  },
];

const DEFAULT_ASSISTANT_CAPABILITIES: Record<string, Array<{ functionalityKey: string; capabilities: Record<string, boolean> }>> = {
  FREE: [
    { functionalityKey: "dashboard", capabilities: { consult: true, explain: true, create: false, modify: false, delete: false, execute: false } },
    { functionalityKey: "customers", capabilities: { consult: true, explain: true, create: false, modify: false, delete: false, execute: false } },
    { functionalityKey: "products", capabilities: { consult: true, explain: true, create: false, modify: false, delete: false, execute: false } },
    { functionalityKey: "quotes", capabilities: { consult: true, explain: true, create: false, modify: false, delete: false, execute: false } },
    { functionalityKey: "sales", capabilities: { consult: false, explain: false, create: false, modify: false, delete: false, execute: false } },
    { functionalityKey: "channels", capabilities: { consult: false, explain: false, create: false, modify: false, delete: false, execute: false } },
    { functionalityKey: "agent", capabilities: { consult: false, explain: false, create: false, modify: false, delete: false, execute: false } },
    { functionalityKey: "reports", capabilities: { consult: false, explain: false, create: false, modify: false, delete: false, execute: false } },
    { functionalityKey: "integrations", capabilities: { consult: false, explain: false, create: false, modify: false, delete: false, execute: false } },
    { functionalityKey: "settings", capabilities: { consult: true, explain: true, create: false, modify: false, delete: false, execute: false } },
  ],
  STARTER: [
    { functionalityKey: "dashboard", capabilities: { consult: true, explain: true, create: false, modify: false, delete: false, execute: false } },
    { functionalityKey: "customers", capabilities: { consult: true, explain: true, create: true, modify: true, delete: false, execute: false } },
    { functionalityKey: "products", capabilities: { consult: true, explain: true, create: true, modify: true, delete: false, execute: false } },
    { functionalityKey: "quotes", capabilities: { consult: true, explain: true, create: true, modify: true, delete: false, execute: false } },
    { functionalityKey: "sales", capabilities: { consult: true, explain: true, create: false, modify: false, delete: false, execute: false } },
    { functionalityKey: "channels", capabilities: { consult: true, explain: true, create: false, modify: false, delete: false, execute: false } },
    { functionalityKey: "agent", capabilities: { consult: true, explain: true, create: false, modify: false, delete: false, execute: false } },
    { functionalityKey: "reports", capabilities: { consult: true, explain: true, create: false, modify: false, delete: false, execute: false } },
    { functionalityKey: "integrations", capabilities: { consult: false, explain: false, create: false, modify: false, delete: false, execute: false } },
    { functionalityKey: "settings", capabilities: { consult: true, explain: true, create: false, modify: true, delete: false, execute: false } },
  ],
  PRO: [
    { functionalityKey: "dashboard", capabilities: { consult: true, explain: true, create: false, modify: false, delete: false, execute: false } },
    { functionalityKey: "customers", capabilities: { consult: true, explain: true, create: true, modify: true, delete: true, execute: false } },
    { functionalityKey: "products", capabilities: { consult: true, explain: true, create: true, modify: true, delete: true, execute: false } },
    { functionalityKey: "quotes", capabilities: { consult: true, explain: true, create: true, modify: true, delete: false, execute: false } },
    { functionalityKey: "sales", capabilities: { consult: true, explain: true, create: true, modify: true, delete: false, execute: false } },
    { functionalityKey: "channels", capabilities: { consult: true, explain: true, create: true, modify: true, delete: false, execute: false } },
    { functionalityKey: "agent", capabilities: { consult: true, explain: true, create: true, modify: true, delete: false, execute: false } },
    { functionalityKey: "reports", capabilities: { consult: true, explain: true, create: true, modify: true, delete: false, execute: false } },
    { functionalityKey: "integrations", capabilities: { consult: true, explain: true, create: false, modify: false, delete: false, execute: false } },
    { functionalityKey: "settings", capabilities: { consult: true, explain: true, create: false, modify: true, delete: false, execute: false } },
  ],
  ENTERPRISE: [
    { functionalityKey: "dashboard", capabilities: { consult: true, explain: true, create: false, modify: false, delete: false, execute: false } },
    { functionalityKey: "customers", capabilities: { consult: true, explain: true, create: true, modify: true, delete: true, execute: true } },
    { functionalityKey: "products", capabilities: { consult: true, explain: true, create: true, modify: true, delete: true, execute: true } },
    { functionalityKey: "quotes", capabilities: { consult: true, explain: true, create: true, modify: true, delete: true, execute: true } },
    { functionalityKey: "sales", capabilities: { consult: true, explain: true, create: true, modify: true, delete: true, execute: true } },
    { functionalityKey: "channels", capabilities: { consult: true, explain: true, create: true, modify: true, delete: true, execute: true } },
    { functionalityKey: "agent", capabilities: { consult: true, explain: true, create: true, modify: true, delete: true, execute: true } },
    { functionalityKey: "reports", capabilities: { consult: true, explain: true, create: true, modify: true, delete: true, execute: true } },
    { functionalityKey: "integrations", capabilities: { consult: true, explain: true, create: true, modify: true, delete: true, execute: true } },
    { functionalityKey: "settings", capabilities: { consult: true, explain: true, create: true, modify: true, delete: true, execute: true } },
  ],
};

async function seedPlansAndCapabilities(): Promise<void> {
  try {
    await mongoose.connect(env.mongodbUri);

    for (const planData of DEFAULT_PLANS) {
      const existingPlan = await Plan.findOne({ key: planData.key });
      if (!existingPlan) {
        await Plan.create(planData);
        console.log(`Plan ${planData.key} created.`);
      } else {
        console.log(`Plan ${planData.key} already exists.`);
      }

      const caps = DEFAULT_ASSISTANT_CAPABILITIES[planData.key];
      if (caps) {
        const existingCaps = await (await import("../src/models/AssistantPlanCapabilities.js")).AssistantPlanCapabilities.findOne({ planKey: planData.key });
        if (!existingCaps) {
          await (await import("../src/models/AssistantPlanCapabilities.js")).AssistantPlanCapabilities.create({
            planKey: planData.key,
            functionalities: caps.map((c) => ({
              functionalityKey: c.functionalityKey,
              capabilities: {
                consult: c.capabilities.consult ?? false,
                explain: c.capabilities.explain ?? false,
                create: c.capabilities.create ?? false,
                modify: c.capabilities.modify ?? false,
                delete: c.capabilities.delete ?? false,
                execute: c.capabilities.execute ?? false,
              },
            })),
          });
          console.log(`Assistant capabilities for ${planData.key} created.`);
        } else {
          console.log(`Assistant capabilities for ${planData.key} already exist.`);
        }
      }
    }

    console.log("All plans and assistant capabilities seeded.");
  } finally {
    await mongoose.disconnect();
  }
}

seedPlansAndCapabilities().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});