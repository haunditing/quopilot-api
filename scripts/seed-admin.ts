import "dotenv/config";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { User } from "../src/models/User.js";
import env from "../src/config/env.js";

async function seedAdmin(): Promise<void> {
  try {
    await mongoose.connect(env.mongodbUri);

    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required");
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log("Admin user already exists.");
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await User.create({
      name: "QuoPilot Administrator",
      email,
      passwordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    });

    console.log("Admin user created.");
    console.log(`Email: ${email}`);
  } finally {
    await mongoose.disconnect();
  }
}

seedAdmin().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
