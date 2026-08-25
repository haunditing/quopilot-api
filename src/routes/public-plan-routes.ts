import { Router } from "express";
import type { Response } from "express";
import type { Request } from "express";
import { listActivePlans } from "../services/plan-service.js";

/**
 * Endpoint PÚBLICO de planes para la landing (`quopilot-landing`).
 * Devuelve solo planes activos y no archivados, ordenados por sortOrder.
 * No requiere autenticación.
 */
const router = Router();

router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const plans = await listActivePlans();
    res.status(200).json(plans);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load plans" });
  }
});

export default router;
