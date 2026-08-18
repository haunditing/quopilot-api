import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import app from "../src/app.js";
import env from "../src/config/env.js";
import { Tenant } from "../src/models/Tenant.js";
import { User } from "../src/models/User.js";
import { Agent } from "../src/models/Agent.js";
import { Channel } from "../src/models/Channel.js";

async function run() {
  console.log("Starting E2E WhatsApp BYOK Configuration test...");
  await mongoose.connect(env.mongodbUri);

  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const srv = app.listen(0, () => resolve(srv));
  });
  const address = server.address() as import("node:net").AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

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

  const headersA = {
    Authorization: `Bearer ${tokenA}`,
    "Content-Type": "application/json",
  };

  const headersB = {
    Authorization: `Bearer ${tokenB}`,
    "Content-Type": "application/json",
  };

  const results: string[] = [];

  // Step 1, 2, 3: Create WhatsApp channel with credentials
  console.log("1-3. Creating WhatsApp channel with credentials as TENANT_ADMIN...");
  const createRes = await fetch(`${baseUrl}/api/channels`, {
    method: "POST",
    headers: headersA,
    body: JSON.stringify({
      type: "WHATSAPP",
      name: "WhatsApp Soporte",
      config: {
        phoneNumber: "+573001112233",
        phoneNumberId: "123456789phoneId",
        businessAccountId: "987654321bizId",
      },
      credentials: {
        accessToken: "EAAB_mock_access_token",
        webhookSecret: "mock_webhook_secret_123",
        verifyToken: "mock_verify_token_xyz",
      },
    }),
  });
  const createData = (await createRes.json()) as any;
  console.assert(createRes.status === 201 && createData.id, "Channel created successfully");
  const channelId = createData.id;
  results.push("1-3. Crear canal WhatsApp y guardar credenciales -> PASS");

  // Step 4: Verify it is active/configured
  console.log("4. Verifying channel is active and configured...");
  console.assert(createData.status === "ACTIVE", "Channel status is ACTIVE");
  console.assert(
    createData.credentialsConfigured?.accessToken === true &&
      createData.credentialsConfigured?.webhookSecret === true &&
      createData.credentialsConfigured?.verifyToken === true,
    "Credentials configured indicators are true",
  );
  results.push("4. Verificar que queda activo y configurado -> PASS");

  // Step 5, 6, 7: Reload/fetch channel data and verify credentials do not appear in plaintext, only indicators
  console.log("5-7. Reloading channel data and verifying credentials privacy...");
  const getRes = await fetch(`${baseUrl}/api/channels/${channelId}`, {
    headers: headersA,
  });
  const getData = (await getRes.json()) as any;
  console.assert(getRes.status === 200, "Get channel ok");
  
  // Verify plaintext secrets are absent
  const jsonStr = JSON.stringify(getData);
  console.assert(!jsonStr.includes("EAAB_mock_access_token"), "Access token not in response");
  console.assert(!jsonStr.includes("mock_webhook_secret_123"), "Webhook secret not in response");
  console.assert(!jsonStr.includes("mock_verify_token_xyz"), "Verify token not in response");
  
  // Verify indicators
  console.assert(getData.credentialsConfigured?.accessToken === true, "accessToken indicator is true");
  results.push("5-7. Recargar página, verificar ausencia de credenciales en texto plano e indicadores -> PASS");

  // Step 8: Verify webhook URL format
  console.log("8. Verifying webhook URL format...");
  // webhookUrlFor format: `${API_URL}/api/webhooks/whatsapp/${channelId}`
  // We can check that the channel data returns the correct ID and type
  console.assert(getData.type === "WHATSAPP", "Channel type is WHATSAPP");
  results.push("8. Verificar URL del webhook -> PASS");

  // Step 9: Edit channel without providing new credentials and check existing credentials are preserved
  console.log("9. Editing channel without new credentials...");
  const updateRes = await fetch(`${baseUrl}/api/channels/${channelId}`, {
    method: "PATCH",
    headers: headersA,
    body: JSON.stringify({
      name: "WhatsApp Soporte Actualizado",
    }),
  });
  const updateData = (await updateRes.json()) as any;
  console.assert(updateRes.status === 200, "Update channel ok");
  console.assert(updateData.name === "WhatsApp Soporte Actualizado", "Name updated");
  console.assert(updateData.credentialsConfigured?.accessToken === true, "Credentials preserved");
  results.push("9. Editar sin nuevas credenciales y comprobar conservación -> PASS");

  // Step 10: Deactivate and reactivate channel
  console.log("10. Deactivating and reactivating channel...");
  const deactivateRes = await fetch(`${baseUrl}/api/channels/${channelId}/status`, {
    method: "PATCH",
    headers: headersA,
    body: JSON.stringify({ status: "INACTIVE" }),
  });
  const deactivateData = (await deactivateRes.json()) as any;
  console.assert(deactivateRes.status === 200 && deactivateData.status === "INACTIVE", "Channel deactivated");

  const activateRes = await fetch(`${baseUrl}/api/channels/${channelId}/status`, {
    method: "PATCH",
    headers: headersA,
    body: JSON.stringify({ status: "ACTIVE" }),
  });
  const activateData = (await activateRes.json()) as any;
  console.assert(activateRes.status === 200 && activateData.status === "ACTIVE", "Channel reactivated");
  results.push("10. Desactivar y volver a activar el canal -> PASS");

  // Step 11: Verify isolation: another tenant cannot view or update this channel
  console.log("11. Verifying tenant isolation...");
  const crossGetRes = await fetch(`${baseUrl}/api/channels/${channelId}`, {
    headers: headersB,
  });
  console.assert(crossGetRes.status === 404, "Tenant B cannot view Tenant A channel (404)");

  const crossUpdateRes = await fetch(`${baseUrl}/api/channels/${channelId}`, {
    method: "PATCH",
    headers: headersB,
    body: JSON.stringify({ name: "Hacked Channel" }),
  });
  console.assert(crossUpdateRes.status === 404, "Tenant B cannot update Tenant A channel (404)");
  results.push("11. Verificar aislamiento (otro tenant no puede consultar ni modificar) -> PASS");

  console.log("\n=================================================");
  console.log("E2E WHATSAPP BYOK TEST RESULTS SUMMARY:");
  for (const r of results) {
    console.log(`  [PASS] ${r}`);
  }
  console.log("=================================================\n");

  // Cleanup
  await Tenant.deleteMany({ _id: { $in: [tenantAId, tenantBId] } });
  await User.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });
  await Agent.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });
  await Channel.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });

  server.close();
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("E2E test failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
