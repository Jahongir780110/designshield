import bcrypt from "bcryptjs";

// 10 salt rounds is the industry standard balance of security vs performance
const SALT_ROUNDS = 10;

/**
 * Hashes a plaintext password using bcrypt
 */
export const hashPassword = async (password: string): Promise<string> => {
    return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compares a candidate plaintext password against an existing salted hash
 */
export const comparePassword = async (
    candidate: string,
    hash: string
): Promise<boolean> => {
    return bcrypt.compare(candidate, hash);
};