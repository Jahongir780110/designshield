import express, { Request, Response } from "express";
import cors from "cors";
import prisma from "./config/db";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth.routes";
import scanRoutes from "./routes/scan.routes";

const app = express();

// 1. Core Middleware
app.use(cors()); // Allow cross-origin requests from Figma iframe & Web Dashboard
app.use(express.json({ limit: "10mb" })); // Parse incoming JSON (large limit for big Figma node trees)

// 2. Database-Aware Health Check Endpoint
app.get("/api/health", async (req: Request, res: Response) => {
    try {
        // Ping PostgreSQL to verify live database connectivity
        await prisma.$queryRaw`SELECT 1`;

        res.status(200).json({
            success: true,
            status: "healthy",
            timestamp: new Date().toISOString(),
            database: "connected",
            uptime: process.uptime(),
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            status: "unhealthy",
            timestamp: new Date().toISOString(),
            database: "disconnected",
            error: error instanceof Error ? error.message : "Database connection failed",
        });
    }
});

// 3. API Routes
app.use("/api/auth", authRoutes);
app.use("/api/scans", scanRoutes);

// 4. Fallback for unhandled 404 routes
app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: { message: `Route not found: ${req.method} ${req.originalUrl}` },
    });
});

// 5. Centralized Error Handler (must be registered last)
app.use(errorHandler);

export default app;