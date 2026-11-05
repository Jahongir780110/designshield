import { z } from "zod";
import { Role } from "@prisma/client";

// Registration Validation Schema
export const registerSchema = z.object({
    body: z.object({
        email: z
            .email("Please provide a valid email address")
            .trim()
            .toLowerCase(),
        password: z
            .string()
            .min(8, "Password must be at least 8 characters long")
            .max(100, "Password cannot exceed 100 characters"),
        name: z
            .string()
            .min(2, "Name must be at least 2 characters")
            .max(50, "Name cannot exceed 50 characters")
            .trim(),
        role: z.enum(Role).optional().default(Role.DESIGNER),
    }),
});

// Login Validation Schema
export const loginSchema = z.object({
    body: z.object({
        email: z
            .email("Please provide a valid email address")
            .trim()
            .toLowerCase(),
        password: z.string().min(1, "Password is required"),
    }),
});

// Infer TypeScript types from Zod schemas (Single Source of Truth)
export type RegisterInput = z.infer<typeof registerSchema>["body"];
export type LoginInput = z.infer<typeof loginSchema>["body"];