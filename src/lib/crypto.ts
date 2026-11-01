import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const N = 16384;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32, { N });
  return `scrypt$${N}$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, n, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = scryptSync(password, Buffer.from(salt, "base64url"), expected.length, { N: Number(n) });
  return timingSafeEqual(actual, expected);
}

/** Session tokens and API keys are stored only as SHA-256 hashes: a leaked database can't log anyone in. */
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function token(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
