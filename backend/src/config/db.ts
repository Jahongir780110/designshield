import { PrismaClient } from "@prisma/client";

declare global {
    // Prevent multiple PrismaClient instances during hot-reloading in development
    var prisma: PrismaClient | undefined;
}

export const prisma =
    global.prisma ||
    new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });

if (process.env.NODE_ENV !== "production") {
    global.prisma = prisma;
}

export default prisma;