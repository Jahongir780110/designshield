import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";

export interface TokenPayload {
    userId: string;
    email: string;
    role: Role;
}

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-dev-only";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

/**
 * Signs a new JWT containing user identity and role
 */
export const signToken = (payload: TokenPayload): string => {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN as any,
    });
};

/**
 * Verifies and decodes a JWT token
 */
export const verifyToken = (token: string): TokenPayload => {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
};