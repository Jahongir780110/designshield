import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/auth";
import { registerSchema, loginSchema } from "../types/auth.dto";

const router = Router();

// Public routes
router.post("/register", validate(registerSchema), AuthController.register);
router.post("/login", validate(loginSchema), AuthController.login);

// Protected routes (Requires valid JWT)
router.get("/me", authenticate, AuthController.getMe);

export default router;