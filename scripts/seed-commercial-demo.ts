/**
 * Seed: Demo Comercial QuoPilot
 *
 * Limpia TODOS los usuarios y tenants (y sus datos transaccionales) y crea
 * un estado determinístico para demo comercial:
 *
 *  - 1 SUPER_ADMIN global
 *  - 1 tenant por plan (FREE, STARTER, PRO, ENTERPRISE) con su TENANT_ADMIN
 *  - 1 AGENTE por cada plan cuyo límite `agents.maxActive` lo permita
 *
 * Uso: npm run seed:commercial
 */

import "dotenv/config";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { Tenant } from "../src/models/Tenant.js";
import { User } from "../src/models/User.js";
import { Plan } from "../src/models/Plan.js";
import { Subscription } from "../src/models/Subscription.js";
import { Customer } from "../src/models/Customer.js";
import { Product } from "../src/models/Product.js";
import { Quote } from "../src/models/Quote.js";
import { QuoteEvent } from "../src/models/QuoteEvent.js";
import { Sale } from "../src/models/Sale.js";
import { SaleEvent } from "../src/models/SaleEvent.js";
import { Conversation } from "../src/models/Conversation.js";
import { ConversationState } from "../src/models/ConversationState.js";
import { Message } from "../src/models/Message.js";
import { Channel } from "../src/models/Channel.js";
import { Agent } from "../src/models/Agent.js";
import { AgentEvent } from "../src/models/AgentEvent.js";
import { Sequence } from "../src/models/Sequence.js";
import { APP_CAPABILITIES_REGISTRY } from "../src/registry/app-capability-registry.js";
import env from "../src/config/env.js";

const CANONICAL_PLANS = [
  {
    key: "FREE",
    name: "Free",
    description: "Plan gratuito con funcionalidades básicas",
    isDefault: true,
    sortOrder: 1,
    features: ["dashboard",
      "tenants", "customers", "products", "quotes", "settings"],
    limits: {
      "customers.max": 25,
      "products.max": 25,
      "quotes.maxMonthly": 20,
      "sales.maxMonthly": 20,
      "channels.max": 0,
      "agents.maxActive": 0,
    },
  },
  {
    key: "STARTER",
    name: "Starter",
    description: "Plan inicial para equipos pequeños",
    isDefault: false,
    sortOrder: 2,
    features: [
      "dashboard",
      "tenants",
      "customers",
      "products",
      "quotes",
      "sales",
      "conversations",
      "settings",
    ],
    limits: {
      "customers.max": 100,
      "products.max": 100,
      "quotes.maxMonthly": 100,
      "sales.maxMonthly": 100,
      "channels.max": 1,
      "agents.maxActive": 1,
    },
  },
  {
    key: "PRO",
    name: "Pro",
    description: "Plan profesional con agente de IA comercial",
    isDefault: false,
    sortOrder: 3,
    features: [
      "dashboard",
      "tenants",
      "customers",
      "products",
      "quotes",
      "sales",
      "conversations",
      "channels",
      "agent",
      "supportAssistant",
      "settings",
    ],
    limits: {
      "customers.max": 500,
      "products.max": 500,
      "quotes.maxMonthly": 500,
      "sales.maxMonthly": 500,
      "channels.max": 3,
      "agents.maxActive": 3,
    },
  },
  {
    key: "ENTERPRISE",
    name: "Enterprise",
    description: "Plan enterprise sin límites",
    isDefault: false,
    sortOrder: 4,
    features: [
      "dashboard",
      "tenants",
      "customers",
      "products",
      "quotes",
      "sales",
      "conversations",
      "channels",
      "agent",
      "supportAssistant",
      "integrations",
      "settings",
    ],
    limits: {
      "customers.max": -1,
      "products.max": -1,
      "quotes.maxMonthly": -1,
      "sales.maxMonthly": -1,
      "channels.max": -1,
      "agents.maxActive": -1,
    },
  },
];

async function cleanDatabase(): Promise<void> {
  console.log("🧹 Limpiando usuarios, tenants y datos transaccionales...");
  await Promise.all([
    User.deleteMany({}),
    Tenant.deleteMany({}),
    Subscription.deleteMany({}),
    Customer.deleteMany({}),
    Product.deleteMany({}),
    Quote.deleteMany({}),
    QuoteEvent.deleteMany({}),
    Sale.deleteMany({}),
    SaleEvent.deleteMany({}),
    Conversation.deleteMany({}),
    ConversationState.deleteMany({}),
    Message.deleteMany({}),
    Channel.deleteMany({}),
    Agent.deleteMany({}),
    AgentEvent.deleteMany({}),
    Sequence.deleteMany({}),
  ]);
}

/**
 * Materializa enabledCapabilities igual que feature-sync:
 * códigos configurables por plan cuyo módulo esté en enabledFeatures.
 */
function materializeCapabilities(enabledFeatures: string[]): string[] {
  const features = new Set(enabledFeatures);
  return APP_CAPABILITIES_REGISTRY.filter(
    (c) => c.configurableByPlan && features.has(c.module),
  ).map((c) => c.code);
}

async function upsertPlans(): Promise<Map<string, { allowsAgents: boolean }>> {
  console.log("📋 Upsert de planes canónicos...");
  const result = new Map<string, { allowsAgents: boolean }>();

  await Plan.updateMany({}, { $set: { isDefault: false } });

  for (const plan of CANONICAL_PLANS) {
    const usageLimits = Object.entries(plan.limits).map(([code, limit]) => ({
      code,
      limit,
    }));

    await Plan.findOneAndUpdate(
      { key: plan.key },
      {
        $set: {
          key: plan.key,
          name: plan.name,
          description: plan.description,
          isActive: true,
          isDefault: plan.isDefault,
          enabledFeatures: plan.features,
          enabledCapabilities: materializeCapabilities(plan.features),
          usageLimits,
          sortOrder: plan.sortOrder,
        },
      },
      { upsert: true, runValidators: true },
    );

    const agentsLimit =
      plan.limits["agents.maxActive"] ?? -1; // ausente o <0 = ilimitado
    const allowsAgents = agentsLimit < 0 || agentsLimit > 0;
    result.set(plan.key, { allowsAgents });
    console.log(
      `   ${plan.key}: ${plan.features.length} features | agentes: ${
        allowsAgents ? `sí (${agentsLimit < 0 ? "ilimitado" : agentsLimit})` : "no"
      }`,
    );
  }

  return result;
}

async function main(): Promise<void> {
  await mongoose.connect(env.mongodbUri);
  console.log("MongoDB connected");

  await cleanDatabase();
  const plans = await upsertPlans();

  const superEmail = process.env.ADMIN_EMAIL ?? "admin@quopilot.local";
  const superPassword = process.env.ADMIN_PASSWORD ?? "Demo1234!";
  const tenantPassword = process.env.DEMO_TENANT_ADMIN_PASSWORD ?? "Demo1234!";

  console.log("👑 Creando super usuario...");
  await User.create({
    name: "Super Admin",
    email: superEmail,
    passwordHash: await bcrypt.hash(superPassword, 12),
    role: "SUPER_ADMIN",
    status: "ACTIVE",
  });
  console.log(`   ${superEmail}`);

  const periodEnd = new Date();
  periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  for (const plan of CANONICAL_PLANS) {
    const slug = plan.key.toLowerCase();
    console.log(`🏢 Tenant ${plan.key}...`);

    const tenant = await Tenant.create({
      name: `Demo ${plan.name}`,
      email: `demo.${slug}@quopilot.local`,
      country: "CO",
      currency: "COP",
      timezone: "America/Bogota",
      status: "ACTIVE",
      plan: plan.key,
    });

    await Subscription.create({
      tenantId: tenant._id,
      planKey: plan.key,
      status: "ACTIVE",
      billingPeriod: "MONTHLY",
      currentPeriodStart: new Date(),
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
    });

    await User.create({
      tenantId: tenant._id,
      name: `Admin ${plan.name}`,
      email: `admin.${slug}@quopilot.local`,
      passwordHash: await bcrypt.hash(tenantPassword, 12),
      role: "TENANT_ADMIN",
      status: "ACTIVE",
    });
    console.log(`   admin.${slug}@quopilot.local`);

    if (plans.get(plan.key)?.allowsAgents) {
      await User.create({
        tenantId: tenant._id,
        name: `Agente ${plan.name}`,
        email: `agente.${slug}@quopilot.local`,
        passwordHash: await bcrypt.hash(tenantPassword, 12),
        role: "AGENT",
        status: "ACTIVE",
      });
      console.log(`   agente.${slug}@quopilot.local`);
    }
  }

  const [users, tenants] = await Promise.all([
    User.countDocuments(),
    Tenant.countDocuments(),
  ]);
  console.log(`\n✅ Demo lista: ${tenants} tenants, ${users} usuarios.`);
  console.log(`   Super admin : ${superEmail} / ${superPassword}`);
  console.log(`   Tenants     : contraseña ${tenantPassword}`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Seed demo comercial falló:", error);
  process.exit(1);
});
