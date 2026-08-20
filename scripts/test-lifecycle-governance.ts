import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import app from "../src/app.js";
import env from "../src/config/env.js";
import { Tenant } from "../src/models/Tenant.js";
import { User } from "../src/models/User.js";
import { Plan } from "../src/models/Plan.js";
import { Customer } from "../src/models/Customer.js";
import { Product } from "../src/models/Product.js";

async function run() {
  console.log("Starting QuoPilot Lifecycle & Governance Integration Test...");
  await mongoose.connect(env.mongodbUri);

  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const srv = app.listen(0, () => resolve(srv));
  });
  const address = server.address() as import("node:net").AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const passwordHash = await bcrypt.hash("Password123!", 10);
  const tenantId = new mongoose.Types.ObjectId().toString();

  try {
    await Plan.updateOne(
      { key: "FREE" },
      {
        $set: {
          key: "FREE",
          name: "Free Plan",
          isActive: true,
          enabledFeatures: ["dashboard", "customers", "products", "quotes", "sales", "settings"],
          enabledCapabilities: ["dashboard.view", "customers.view", "customers.create", "products.view", "products.create", "quotes.view", "quotes.create"],
          usageLimits: [{ code: "quotes.maxMonthly", limit: 2 }],
        },
      },
      { upsert: true }
    );

    await Plan.updateOne(
      { key: "PRO" },
      {
        $set: {
          key: "PRO",
          name: "Pro Plan",
          isActive: true,
          enabledFeatures: ["dashboard", "customers", "products", "quotes", "sales", "settings"],
          enabledCapabilities: ["dashboard.view", "customers.view", "customers.create", "products.view", "products.create", "quotes.view", "quotes.create"],
          usageLimits: [{ code: "quotes.maxMonthly", limit: 100 }],
        },
      },
      { upsert: true }
    );

    await Tenant.create({
      _id: tenantId,
      name: "Tenant Lifecycle Test",
      email: `lifecycle-${Date.now()}@test.com`,
      adminName: "Admin Test",
      status: "ACTIVE",
      plan: "PRO",
    });

    const admin = await User.create({
      tenantId,
      name: "Admin Test",
      email: `admin-life-${Date.now()}@test.com`,
      passwordHash,
      role: "TENANT_ADMIN",
    });

    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: admin.email, password: "Password123!" }),
    });
    const token = ((await loginRes.json()) as { accessToken: string }).accessToken;
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    const cust = await Customer.create({ tenantId, name: "Empresa Test", email: "empresa@test.com" });
    const prod = await Product.create({ tenantId, name: "Servicio Cloud", basePrice: 100, currency: "COP", sku: "SRV-1" });

    const quotePayload = {
      customerId: cust._id.toString(),
      items: [{ productId: prod._id.toString(), quantity: 1, unitPrice: 100 }],
    };

    console.log("1. Creating quotes on PRO plan (exceeding FREE limit of 2)...");
    const q1 = await fetch(`${baseUrl}/api/quotes`, {
      method: "POST",
      headers,
      body: JSON.stringify(quotePayload),
    });
    if (q1.status !== 201) throw new Error(`Q1 failed with status ${q1.status}`);

    const q2 = await fetch(`${baseUrl}/api/quotes`, {
      method: "POST",
      headers,
      body: JSON.stringify(quotePayload),
    });
    if (q2.status !== 201) throw new Error(`Q2 failed with status ${q2.status}`);

    const q3 = await fetch(`${baseUrl}/api/quotes`, {
      method: "POST",
      headers,
      body: JSON.stringify(quotePayload),
    });
    if (q3.status !== 201) throw new Error(`Q3 failed with status ${q3.status}`);

    console.log("2. Downgrading tenant from PRO to FREE...");
    await Tenant.findByIdAndUpdate(tenantId, { plan: "FREE" });

    console.log("3. Verifying existing data remains intact and queryable...");
    const getQuotesRes = await fetch(`${baseUrl}/api/quotes`, { headers });
    const quotesJson = (await getQuotesRes.json()) as any;
    const quotesCount = quotesJson.data?.length ?? 0;
    console.log("Existing quotes count:", quotesCount);
    if (quotesCount !== 3) throw new Error("Quotes not intact");

    console.log("4. Attempting 4th quote creation on FREE plan (should be rejected with 429 QUOTA_EXCEEDED)...");
    const q4 = await fetch(`${baseUrl}/api/quotes`, {
      method: "POST",
      headers,
      body: JSON.stringify(quotePayload),
    });
    const q4Json = await q4.json() as any;
    console.log("Q4 status:", q4.status, "body:", q4Json);
    if (q4.status !== 429 || q4Json.code !== "QUOTA_EXCEEDED") throw new Error("Q4 quota enforcement failed");

    console.log("5. Upgrading tenant back from FREE to PRO...");
    await Tenant.findByIdAndUpdate(tenantId, { plan: "PRO" });

    console.log("6. Verifying quote creation is allowed immediately after upgrade...");
    const q5 = await fetch(`${baseUrl}/api/quotes`, {
      method: "POST",
      headers,
      body: JSON.stringify(quotePayload),
    });
    if (q5.status !== 201) throw new Error(`Q5 failed after upgrade with status ${q5.status}`);

    console.log("\n=================================================");
    console.log("LIFECYCLE & GOVERNANCE INTEGRATION TEST: PASS");
    console.log("=================================================\n");
  } catch (err) {
    console.error("Lifecycle integration test FAILED:", err);
    process.exit(1);
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

run();
