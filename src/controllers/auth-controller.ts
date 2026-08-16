import { Request, Response } from "express";
import {
  changePasswordSchema,
  loginSchema,
} from "../schemas/auth-schema.js";
import { changePassword, login } from "../services/auth-service.js";
import type { AuthenticatedRequest } from "../middleware/auth-middleware.js";

export async function loginController(
  req: Request,
  res: Response
): Promise<void> {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid login data",
      errors: result.error.flatten(),
    });

    return;
  }

  const { email, password } = result.data;

  const loginResult = await login(email, password);

  if (!loginResult) {
    res.status(401).json({
      message: "Invalid email or password",
    });

    return;
  }

  res.status(200).json(loginResult);
}

export async function changePasswordController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const result = changePasswordSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid password data",
      errors: result.error.flatten(),
    });

    return;
  }

  if (!req.user) {
    res.status(401).json({
      message: "Authentication required",
    });

    return;
  }

  try {
    await changePassword(
      req.user.id,
      result.data.currentPassword,
      result.data.password,
    );

    res.status(200).json({
      message: "Password changed",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to change password";

    if (message === "Current password is incorrect") {
      res.status(400).json({
        message,
      });

      return;
    }

    if (message === "User not found") {
      res.status(404).json({
        message,
      });

      return;
    }

    res.status(500).json({
      message,
    });
  }
}