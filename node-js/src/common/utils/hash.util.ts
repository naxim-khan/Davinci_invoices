import { hashSync, verifySync } from '@node-rs/bcrypt';

/**
 * Hash a password using bcrypt
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
    return hashSync(password, 12);
}

/**
 * Compare a password with a hash
 * @param password - Plain text password
 * @param hash - Hashed password
 * @returns True if password matches hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return verifySync(password, hash);
}
