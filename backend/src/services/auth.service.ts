import prisma from "../config/db";
import { hashPassword, comparePassword } from "../utils/password";
import { signToken } from "../utils/jwt";
import { RegisterInput, LoginInput } from "../types/auth.dto";

export class AuthService {
    /**
     * Registers a new user, hashes their password, and issues a JWT
     */
    static async register(input: RegisterInput) {
        // 1. Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: input.email },
        });

        if (existingUser) {
            const error: any = new Error("A user with this email already exists");
            error.statusCode = 409; // Conflict
            throw error;
        }

        // 2. Hash password
        const passwordHash = await hashPassword(input.password);

        // 3. Persist user to PostgreSQL
        const user = await prisma.user.create({
            data: {
                email: input.email,
                passwordHash,
                name: input.name,
                role: input.role,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
            },
        });

        // 4. Issue JWT
        const token = signToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        return { user, token };
    }

    /**
     * Authenticates user credentials and issues a JWT
     */
    static async login(input: LoginInput) {
        // 1. Find user by email
        const user = await prisma.user.findUnique({
            where: { email: input.email },
        });

        // Security Best Practice: Use a generic error message to prevent User Enumeration attacks
        if (!user) {
            const error: any = new Error("Invalid email or password");
            error.statusCode = 401; // Unauthorized
            throw error;
        }

        // 2. Verify password hash
        const isPasswordValid = await comparePassword(input.password, user.passwordHash);
        if (!isPasswordValid) {
            const error: any = new Error("Invalid email or password");
            error.statusCode = 401;
            throw error;
        }

        // 3. Issue JWT
        const token = signToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                createdAt: user.createdAt,
            },
            token,
        };
    }

    static async getProfile(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
            },
        });

        if (!user) {
            const error: any = new Error("User not found");
            error.statusCode = 404;
            throw error;
        }

        return user;
    }
}