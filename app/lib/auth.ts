import crypto from "crypto";
import { cookies } from "next/headers";

const SESSION_SECRET = process.env.SESSION_SECRET || "fallback_secret_39828472";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return hash === testHash;
}

export function createSessionToken(userId: string): string {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const data = `${userId}:${expiresAt}`;
  const hmac = crypto.createHmac("sha256", SESSION_SECRET).update(data).digest("hex");
  return `${data}:${hmac}`;
}

export function verifySessionToken(token: string): string | null {
  try {
    const parts = token.split(":");
    if (parts.length !== 3) return null;
    
    const [userId, expiresAtStr, hmac] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);
    
    if (Date.now() > expiresAt) return null;
    
    const data = `${userId}:${expiresAt}`;
    const expectedHmac = crypto.createHmac("sha256", SESSION_SECRET).update(data).digest("hex");
    
    if (hmac === expectedHmac) {
      return userId;
    }
  } catch (err) {
    return null;
  }
  return null;
}

export async function getSessionUser(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;
  if (!sessionToken) return null;
  return verifySessionToken(sessionToken);
}
