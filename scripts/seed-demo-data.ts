import "dotenv/config";
import mongoose from "mongoose";
import { Tenant } from "../src/models/Tenant.js";
import { Customer } from "../src/models/Customer.js";
import { Product } from "../src/models/Product.js";
import env from "../src/config/env.js";

async function seedDemoData(): Promise<void> {
  try {
    await mongoose.connect(env.mongodbUri);

    const tenantEmail = process.env.DEMO_TENANT_EMAIL;

    if (!tenantEmail) {
      throw new Error("DEMO_TENANT_EMAIL is required");
    }

    const tenant = await Tenant.findOne({
      email: tenantEmail,
    });

    if (!tenant) {
      throw new Error("Demo tenant not found. Run npm run seed:demo first.");
    }

    const tenantId = tenant._id;

    /*
     * CUSTOMER
     */

    let customer = await Customer.findOne({
      tenantId,
      email: "carlos.demo@example.com",
    });

    if (!customer) {
      customer = await Customer.create({
        tenantId,
        name: "Carlos Demo",
        email: "carlos.demo@example.com",
        phone: "+573001234567",
        whatsappId: "demo-whatsapp-001",
        country: "CO",
      });

      console.log(`Customer created: ${customer.name}`);
    } else {
      console.log(`Customer already exists: ${customer.name}`);
    }

    /*
     * PRODUCTS
     */

    const products = [
      {
        name: "Producto Demo Básico",
        description: "Producto utilizado para pruebas del MVP.",
        sku: "DEMO-BASIC",
        unitPrice: 150000,
      },
      {
        name: "Producto Demo Premium",
        description: "Producto premium utilizado para pruebas.",
        sku: "DEMO-PREMIUM",
        unitPrice: 350000,
      },
      {
        name: "Servicio Demo",
        description: "Servicio utilizado para pruebas comerciales.",
        sku: "DEMO-SERVICE",
        unitPrice: 500000,
      },
    ];

    for (const productData of products) {
      const existingProduct = await Product.findOne({
        tenantId,
        sku: productData.sku,
      });

      if (existingProduct) {
        console.log(`Product already exists: ${existingProduct.name}`);
        continue;
      }

      const product = await Product.create({
        tenantId,
        ...productData,
        currency: "COP",
        status: "ACTIVE",
      });

      console.log(`Product created: ${product.name}`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

seedDemoData().catch((error) => {
  console.error("Demo data seed failed:", error);

  process.exit(1);
});
