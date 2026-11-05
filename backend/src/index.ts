import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import prisma from "./config/db";

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`🛡️  DesignShield Backend listening on port ${PORT}`);
    console.log(`📡 Health check available at: http://localhost:${PORT}/api/health`);
    console.log(`⚙️  Environment: ${process.env.NODE_ENV || "development"}`);
});

// Graceful Shutdown: Cleanly close DB pool when process is terminated
const handleShutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
        await prisma.$disconnect();
        console.log("🔌 Database connections closed.");
        process.exit(0);
    });
};

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));