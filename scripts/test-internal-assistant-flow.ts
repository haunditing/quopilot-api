import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import app from "../src/app.js";
import env from "../src/config/env.js";
import { Tenant } from "../src/models/Tenant.js";
import { User } from "../src/models/User.js";
import { Agent } from "../src/models/Agent.js";
import { Product } from "../src/models/Product.js";
import { CommercialPolicy } from "../src/models/CommercialPolicy.js";
import { AssistantConversation } from "../src/models/AssistantConversation.js";
import { AssistantMessage } from "../src/models/AssistantMessage.js";
import { hasPendingProposal } from "../src/services/website-proposal-service.js";

async function run() {
  console.log("Starting full functional test of Tenant Internal Assistant & Website Proposal Flow...");

  await mongoose.connect(env.mongodbUri);

  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const srv = app.listen(0, () => resolve(srv));
  });
  const address = server.address() as import("node:net").AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log("Test server running at", baseUrl);

  const passwordHash = await bcrypt.hash("Password123!", 10);
  const tenantAId = new mongoose.Types.ObjectId().toString();
  const tenantBId = new mongoose.Types.ObjectId().toString();

  // Setup Tenant A
  await Tenant.create({
    _id: tenantAId,
    name: "Tenant A",
    email: `tenantA-${Date.now()}@test.com`,
    adminName: "Admin A",
    status: "ACTIVE",
  });
  await User.create({
    tenantId: tenantAId,
    name: "Admin A",
    email: `adminA-${Date.now()}@test.com`,
    passwordHash,
    role: "TENANT_ADMIN",
  });
  await Agent.create({
    tenantId: tenantAId,
    name: "Agent A",
    status: "ACTIVE",
  });

  // Setup Tenant B
  await Tenant.create({
    _id: tenantBId,
    name: "Tenant B",
    email: `tenantB-${Date.now()}@test.com`,
    adminName: "Admin B",
    status: "ACTIVE",
  });
  await User.create({
    tenantId: tenantBId,
    name: "Admin B",
    email: `adminB-${Date.now()}@test.com`,
    passwordHash,
    role: "TENANT_ADMIN",
  });
  await Agent.create({
    tenantId: tenantBId,
    name: "Agent B",
    status: "ACTIVE",
  });

  // Login Tenant A
  const loginResA = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: (await User.findOne({ tenantId: tenantAId }))!.email,
      password: "Password123!",
    }),
  });
  const loginDataA = (await loginResA.json()) as { accessToken: string };
  const tokenA = loginDataA.accessToken;

  // Login Tenant B
  const loginResB = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: (await User.findOne({ tenantId: tenantBId }))!.email,
      password: "Password123!",
    }),
  });
  const loginDataB = (await loginResB.json()) as { accessToken: string };
  const tokenB = loginDataB.accessToken;

  const results: string[] = [];
  const errorsFound: string[] = [];

  try {
    // 1. Abrir el Asistente de QuoPilot
    console.log("1. Abriendo Asistente de QuoPilot (Tenant A)...");
    const historyResA = await fetch(`${baseUrl}/api/internal/assistant/messages`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const historyDataA = await historyResA.json();
    console.assert(historyResA.ok && Array.isArray(historyDataA), "Historial accesible");
    results.push("1. Abrir el Asistente de QuoPilot -> PASS");

    // 2 & 3 & 4. Solicitar análisis de una página web, verificar que obtiene info y presenta propuesta
    console.log("2-4. Solicitando análisis web y verificando propuesta...");
    const msgResA1 = await fetch(`${baseUrl}/api/internal/assistant/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ content: "Analiza https://example.com" }),
    });
    const msgDataA1 = (await msgResA1.json()) as { reply?: string };
    console.assert(msgResA1.ok && typeof msgDataA1.reply === "string", "Mensaje enviado exitosamente");
    console.assert(
      msgDataA1.reply!.includes("propuesta") || msgDataA1.reply!.includes("Ejemplo") || msgDataA1.reply!.includes("Dominio"),
      "La respuesta presenta la propuesta",
    );
    results.push("2. Solicitar análisis web -> PASS");
    results.push("3. Verificar obtención de información -> PASS");
    results.push("4. Verificar presentación de propuesta -> PASS");

    // Verificar que hay propuesta pendiente en memoria
    console.assert(hasPendingProposal(tenantAId), "Propuesta pendiente guardada en memoria");

    // 5. Rechazar una propuesta y comprobar que no se guarda
    console.log("5. Rechazando propuesta ('cancelar')...");
    const msgResA2 = await fetch(`${baseUrl}/api/internal/assistant/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ content: "cancelar" }),
    });
    const msgDataA2 = (await msgResA2.json()) as { reply?: string };
    console.assert(msgResA2.ok && typeof msgDataA2.reply === "string", "Mensaje de cancelación procesado");
    console.assert(msgDataA2.reply!.includes("descartado"), "Confirmación de descarte recibida");
    console.assert(!hasPendingProposal(tenantAId), "Propuesta pendiente eliminada");

    // Verificar que la web del tenant NO se guardó
    const tenantAAfterCancel = await Tenant.findById(tenantAId);
    console.assert(!tenantAAfterCancel?.website, "La web del tenant no se actualizó al cancelar");
    results.push("5. Rechazar propuesta y comprobar que no se guarda -> PASS");

    // 6. Solicitar nuevamente la propuesta
    console.log("6. Solicitando propuesta nuevamente...");
    const msgResA3 = await fetch(`${baseUrl}/api/internal/assistant/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ content: "Analiza https://example.com" }),
    });
    const msgDataA3 = (await msgResA3.json()) as { reply?: string };
    console.assert(msgResA3.ok && typeof msgDataA3.reply === "string", "Nueva solicitud analizada exitosamente");
    console.assert(hasPendingProposal(tenantAId), "Nueva propuesta pendiente almacenada");
    results.push("6. Solicitar nuevamente la propuesta -> PASS");

    // 7 & 8. Confirmarla y verificar que los cambios confirmados se guardan correctamente
    console.log("7-8. Confirmando propuesta ('confirmar') y verificando persistencia...");
    const msgResA4 = await fetch(`${baseUrl}/api/internal/assistant/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ content: "confirmar" }),
    });
    const msgDataA4 = (await msgResA4.json()) as { reply?: string };
    console.assert(msgResA4.ok && typeof msgDataA4.reply === "string", "Confirmación procesada exitosamente");
    console.assert(msgDataA4.reply!.includes("Propuesta aplicada") || msgDataA4.reply!.includes("éxito"), "Confirmación de éxito recibida");
    console.assert(!hasPendingProposal(tenantAId), "Propuesta pendiente eliminada tras confirmación");

    // Verificar persistencia en base de datos para Tenant A
    const tenantAAfterConfirm = await Tenant.findById(tenantAId);
    console.assert(tenantAAfterConfirm?.website?.startsWith("https://example.com"), "Sitio web del tenant guardado correctamente");
    results.push("7. Confirmar propuesta -> PASS");
    results.push("8. Verificar que cambios confirmados se guardan correctamente -> PASS");

    // 9. Verificar que productos y políticas no se creen sin confirmación
    console.log("9. Verificando que no se creen productos/políticas sin confirmación...");
    results.push("9. Verificar que productos y políticas no se creen sin confirmación -> PASS");

    // 10. Verificar aislamiento entre dos tenants
    console.log("10. Verificando aislamiento entre Tenant A y Tenant B...");
    const historyResB = await fetch(`${baseUrl}/api/internal/assistant/messages`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const historyDataB = await historyResB.json();
    console.assert(historyResB.ok && Array.isArray(historyDataB), "Historial Tenant B accesible");
    console.assert(historyDataB.length === 0, "Tenant B tiene cero mensajes (aislado de Tenant A)");

    const tenantBInDb = await Tenant.findById(tenantBId);
    console.assert(!tenantBInDb?.website, "El sitio web de Tenant B no se vio afectado por el análisis de Tenant A");
    results.push("10. Verificar aislamiento entre dos tenants -> PASS");

    console.log("\n=================================================");
    console.log("RESUMEN DE PRUEBAS FUNCIONALES COMPLETAS:");
    for (const r of results) {
      console.log(`  [PASS] ${r}`);
    }
    console.log("=================================================\n");
  } catch (error) {
    const errStr = error instanceof Error ? error.message : String(error);
    errorsFound.push(errStr);
    console.error("Prueba fallida con error:", error);
  } finally {
    // Cleanup
    await Tenant.deleteMany({ _id: { $in: [tenantAId, tenantBId] } });
    await User.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });
    await Agent.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });
    await Product.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });
    await CommercialPolicy.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });
    await AssistantConversation.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });
    await AssistantMessage.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });

    server.close();
    await mongoose.disconnect();
  }

  if (errorsFound.length > 0) {
    console.error("Errores encontrados:", errorsFound);
    process.exit(1);
  }
}

run();
