import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { verifyToken } from "../utils/jwt";

/**
 * Middleware that authenticates incoming requests via JWT in the Authorization header
 */
export const authenticate = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        // 1. Verify Authorization header format
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                error: { message: "Authentication required. Missing or malformed Bearer token." },
            });
        }

        // 2. Extract and verify token
        const token = authHeader.split(" ")[1];
        const payload = verifyToken(token);

        // 3. Attach user identity to request object for downstream handlers
        req.user = payload;

        return next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: { message: "Invalid or expired authentication token." },
        });
    }
};

/**
 * Higher-order middleware that restricts access to specific roles (RBAC)
 */
export const authorizeRoles = (...allowedRoles: Role[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: { message: "Authentication required." },
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: {
                    message: `Access denied. Requires one of the following roles: [${allowedRoles.join(", ")}]`,
                },
            });
        }

        return next();
    };
};