import { Router } from "express";
import {
  changePasswordController,
  loginController,
} from "../controllers/auth-controller.js";
import { authenticate } from "../middleware/auth-middleware.js";

import "../capabilities/auth.js";

const router = Router();

router.post("/login", loginController);
router.post("/change-password", authenticate, changePasswordController);

export default router;
