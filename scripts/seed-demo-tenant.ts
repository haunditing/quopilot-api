import "dotenv/config";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { Tenant } from "../src/models/Tenant.js";
import { User } from "../src/models/User.js";
import env from "../src/config/env.js";

async function seedDemoTenant(): Promise<void> {
  try {
    await mongoose.connect(env.mongodbUri);

    const tenantName = process.env.DEMO_TENANT_NAME;
    const tenantEmail = process.env.DEMO_TENANT_EMAIL;
    const adminName = process.env.DEMO_TENANT_ADMIN_NAME;
    const adminPassword = process.env.DEMO_TENANT_ADMIN_PASSWORD;

    if (!tenantName || !tenantEmail || !adminName || !adminPassword) {
      throw new Error("Demo tenant environment variables are required");
    }

    let tenant = await Tenant.findOne({
      email: tenantEmail,
    });

    if (!tenant) {
      tenant = await Tenant.create({
        name: tenantName,
        email: tenantEmail,
        country: "CO",
        currency: "COP",
        timezone: "America/Bogota",
        status: "ACTIVE",
      });

      console.log(`Tenant created: ${tenant.name}`);
    } else {
      console.log(`Tenant already exists: ${tenant.name}`);
    }

    const existingAdmin = await User.findOne({
      email: tenantEmail,
    });

    if (existingAdmin) {
      console.log("Tenant admin already exists.");
      return;
    }

    const passwordHash = await bcrypt.hash(adminPassword, 12);

    await User.create({
      tenantId: tenant._id,
      name: adminName,
      email: tenantEmail,
      passwordHash,
      role: "TENANT_ADMIN",
      status: "ACTIVE",
    });

    console.log("Tenant admin created.");
  } finally {
    await mongoose.disconnect();
  }
}

seedDemoTenant().catch((error) => {
  console.error("Demo tenant seed failed:", error);
  process.exit(1);
});
