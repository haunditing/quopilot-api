import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import env from "../src/config/env.js";
import { Tenant } from "../src/models/Tenant.js";
import { User } from "../src/models/User.js";
import { Agent } from "../src/models/Agent.js";
import { Product } from "../src/models/Product.js";
import { CommercialPolicy } from "../src/models/CommercialPolicy.js";
import { Channel } from "../src/models/Channel.js";

async function seedQuoPilotDemo() {
  console.log("Seeding QuoPilot Demo Tenant...");
  await mongoose.connect(env.mongodbUri);

  const demoEmail = "demo@quopilot.app";
  const passwordHash = await bcrypt.hash("Password123!", 10);

  // 1. Tenant (Idempotent by email)
  let tenant = await Tenant.findOne({ email: demoEmail });
  if (!tenant) {
    tenant = await Tenant.create({
      name: "QuoPilot AI",
      legalName: "QuoPilot AI S.A.S.",
      email: demoEmail,
      country: "Colombia",
      currency: "COP",
      timezone: "America/Bogota",
      status: "ACTIVE",
    });
    console.log("  [Created] Tenant: QuoPilot AI");
  } else {
    console.log("  [Existing] Tenant: QuoPilot AI");
  }

  const tenantId = tenant._id.toString();

  // 2. User TENANT_ADMIN (Idempotent by email)
  let adminUser = await User.findOne({ email: demoEmail, tenantId });
  if (!adminUser) {
    await User.create({
      tenantId,
      name: "Admin Demo",
      email: demoEmail,
      passwordHash,
      role: "TENANT_ADMIN",
      status: "ACTIVE",
      mustChangePassword: false,
    });
    console.log("  [Created] User: TENANT_ADMIN (demo@quopilot.app)");
  } else {
    console.log("  [Existing] User: TENANT_ADMIN");
  }

  // 3. Agent (Idempotent by tenantId)
  let agent = await Agent.findOne({ tenantId });
  const agentData = {
    tenantId,
    name: "QuoPilot Asesor",
    language: "es",
    tone: "FRIENDLY",
    commercialObjective:
      "Vender QuoPilot ayudando a las empresas a automatizar sus ventas, cotizaciones y atención al cliente mediante IA.",
    welcomeMessage:
      "¡Hola {name}! Soy el asesor virtual de QuoPilot. ¿Te gustaría conocer cómo nuestra plataforma de IA puede duplicar las ventas y automatizar las cotizaciones de tu negocio?",
    behaviorRules: [
      "1. Explica qué hace QuoPilot: una plataforma SaaS de ventas impulsada por IA que automatiza la atención, cotizaciones y ventas en canales como WhatsApp y WebChat.",
      "2. Presenta los planes disponibles: QuoPilot Starter, QuoPilot Pro y QuoPilot Enterprise.",
      "3. Identifica el interés del prospecto y sus necesidades comerciales.",
      "4. Crea una cotización cuando corresponda usando la herramienta createQuote con el plan seleccionado.",
      "5. Solicita la confirmación del cliente tras presentar la cotización.",
      "6. Acepta la cotización (tool acceptQuote) cuando el cliente confirme explícitamente.",
    ],
    productScope: "ALL" as const,
    status: "ACTIVE" as const,
    llm: {
      provider: "google",
      apiKey: process.env.GEMINI_API_KEY ?? "AIzaSyDemoKey1234567890abcdefghi",
      model: "gemini-1.5-flash-lite",
    } as const,
  };

  if (!agent) {
    agent = await Agent.create(agentData);
    console.log("  [Created] Agent: QuoPilot Asesor");
  } else {
    await Agent.updateOne({ _id: agent._id }, { $set: agentData });
    console.log("  [Updated/Existing] Agent: QuoPilot Asesor");
  }

  // 4. Products / Plans (DEMO prices clearly identified - Idempotent by SKU)
  const demoProducts = [
    {
      sku: "QP-STARTER",
      name: "QuoPilot Starter",
      description:
        "Ideal para pequeños negocios. Incluye 1 agente de IA comercial, hasta 500 cotizaciones mensuales, canal WebChat y soporte por correo.",
      basePrice: 150000, // DEMO PRICE
      unitPrice: 150000, // DEMO PRICE
      taxRate: 19,
      currency: "COP",
      itemType: "SERVICE" as const,
      category: "Planes SaaS",
      status: "ACTIVE" as const,
    },
    {
      sku: "QP-PRO",
      name: "QuoPilot Pro",
      description:
        "Para empresas en expansión. Incluye 3 agentes de IA, cotizaciones ilimitadas, integración con WhatsApp BYOK e Instagram, y analítica comercial avanzada.",
      basePrice: 350000, // DEMO PRICE
      unitPrice: 350000, // DEMO PRICE
      taxRate: 19,
      currency: "COP",
      itemType: "SERVICE" as const,
      category: "Planes SaaS",
      status: "ACTIVE" as const,
    },
    {
      sku: "QP-ENTERPRISE",
      name: "QuoPilot Enterprise",
      description:
        "Solución corporativa a la medida. Agentes ilimitados, modelos LLM personalizados, handoff humano avanzado y soporte prioritario 24/7.",
      basePrice: 850000, // DEMO PRICE
      unitPrice: 850000, // DEMO PRICE
      taxRate: 19,
      currency: "COP",
      itemType: "SERVICE" as const,
      category: "Planes SaaS",
      status: "ACTIVE" as const,
    },
  ];

  for (const p of demoProducts) {
    const existingProduct = await Product.findOne({ tenantId, sku: p.sku });
    if (!existingProduct) {
      await Product.create({ tenantId, ...p });
      console.log(
        `  [Created] Product/Plan: ${p.name} ($${p.basePrice} ${p.currency})`,
      );
    } else {
      await Product.updateOne({ _id: existingProduct._id }, { $set: p });
      console.log(
        `  [Updated] Product/Plan: ${p.name} ($${p.basePrice} ${p.currency})`,
      );
    }
  }

  // 5. Commercial Policy (Idempotent by tenantId)
  let policy = await CommercialPolicy.findOne({ tenantId });
  const policyData = {
    tenantId,
    paymentTerms:
      "Pago mensual anticipado por transferencia bancaria o tarjeta de crédito.",
    shippingPolicy:
      "Activación inmediata y provisionamiento automático del tenant en menos de 24 horas.",
    warrantyPolicy:
      "Garantía de satisfacción de 30 días o devolución del 100% de su dinero.",
    returnPolicy:
      "Cancelación de suscripción en cualquier momento sin penalizaciones.",
    discountPolicy: "15% de descuento en pagos anuales anticipados.",
    notes: "Precios demo sujetos a términos de prueba comercial.",
  };

  if (!policy) {
    await CommercialPolicy.create(policyData);
    console.log("  [Created] Commercial Policy");
  } else {
    await CommercialPolicy.updateOne({ _id: policy._id }, { $set: policyData });
    console.log("  [Updated/Existing] Commercial Policy");
  }

  // 6. Channel WEB_CHAT (Idempotent by tenantId & type)
  let webChatChannel = await Channel.findOne({ tenantId, type: "WEB_CHAT" });
  const channelData = {
    tenantId,
    agentId: agent._id,
    type: "WEB_CHAT" as const,
    name: "WebChat QuoPilot Demo",
    status: "ACTIVE" as const,
    config: {
      widget: {
        title: "QuoPilot Ventas",
        greetingMessage:
          "¡Hola {name}! Soy el asesor virtual de QuoPilot. ¿Te gustaría conocer nuestros planes para automatizar las ventas de tu negocio?",
        primaryColor: "#2563eb",
        position: "bottom-right" as const,
      },
    },
  };

  if (!webChatChannel) {
    await Channel.create(channelData);
    console.log("  [Created] Channel: WEB_CHAT (QuoPilot Demo)");
  } else {
    await Channel.updateOne({ _id: webChatChannel._id }, { $set: channelData });
    console.log("  [Updated/Existing] Channel: WEB_CHAT");
  }

  console.log("\nQuoPilot Demo Tenant seeded successfully!");

  // Verification
  console.log("\nVerifying seed results:");
  const verifiedTenant = await Tenant.findOne({ email: demoEmail });
  const verifiedAgent = await Agent.findOne({ tenantId });
  const verifiedProducts = await Product.find({ tenantId });
  const verifiedChannel = await Channel.findOne({ tenantId, type: "WEB_CHAT" });

  console.log(
    `- Tenant: ${verifiedTenant?.name} (${verifiedTenant?.country}, ${verifiedTenant?.currency}) -> OK`,
  );
  console.log(`- Agent: ${verifiedAgent?.name} (${verifiedAgent?.tone}) -> OK`);
  console.log(`- Products: ${verifiedProducts.length} plans created -> OK`);
  console.log(
    `- Channel: ${verifiedChannel?.name} (${verifiedChannel?.status}) -> OK`,
  );

  await mongoose.disconnect();
}

seedQuoPilotDemo().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
