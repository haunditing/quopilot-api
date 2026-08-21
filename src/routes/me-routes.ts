import { Router } from "express";
import { authenticate } from "../middleware/auth-middleware.js";
import { getMeCapabilitiesController } from "../controllers/me-capabilities-controller.js";

const router = Router();

router.get("/capabilities", authenticate, getMeCapabilitiesController);

export default router;
