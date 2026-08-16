import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

interface LoginResult {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    tenantId?: string;
    mustChangePassword: boolean;
  };
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResult | null> {
  const user = await User.findOne({
    email: email.toLowerCase().trim(),
  });

  if (!user || user.status !== "ACTIVE") {
    return null;
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    return null;
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined");
  }

  const accessToken = jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      tenantId: user.tenantId?.toString(),
    },
    secret,
    {
      expiresIn: "1d",
    },
  );

  user.lastLogin = new Date();
  await user.save();

  return {
    accessToken,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId?.toString(),
      mustChangePassword: user.mustChangePassword,
    },
  };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  const currentMatches = await bcrypt.compare(currentPassword, user.passwordHash);

  if (!currentMatches) {
    throw new Error("Current password is incorrect");
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.mustChangePassword = false;
  await user.save();
}
