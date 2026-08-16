import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { AuthUser, UserRole } from "../types/auth";

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

interface AccessTokenPayload extends JwtPayload {
  sub: string;
  role: UserRole;
  tenantId?: string;
}

export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({
      message: "Authentication required",
    });
    return;
  }

  const token = authorization.substring(7);
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({
      message: "JWT configuration error",
    });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as AccessTokenPayload;

    if (!payload.sub || !payload.role) {
      res.status(401).json({
        message: "Invalid access token",
      });
      return;
    }

    req.user = {
      id: payload.sub,
      role: payload.role,
      tenantId: payload.tenantId,
    };

    next();
  } catch {
    res.status(401).json({
      message: "Invalid or expired access token",
    });
  }
}
