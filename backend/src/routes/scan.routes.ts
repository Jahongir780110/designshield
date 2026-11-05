import { Router } from "express";
import { ScanController } from "../controllers/scan.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createScanSchema } from "../types/figma.dto";

const router = Router();

// All scan routes require a logged-in user with a valid JWT
router.use(authenticate);

// POST /api/scans - Run a scan on Figma nodes
router.post("/", validate(createScanSchema), ScanController.createScan);

// GET /api/scans - List user's historical scans
router.get("/", ScanController.listScans);

// GET /api/scans/:id - Get a specific scan report
router.get("/:id", ScanController.getScan);

export default router;