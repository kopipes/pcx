// Server-only utilities — do NOT import this in client components
import { nanoid, customAlphabet } from "nanoid";
import { createHash } from "crypto";

export function generateId(): string {
  return nanoid();
}

// Alphanumeric only — no hyphens or underscores that break URLs in emails
const alphanumeric = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", 32);

export function generateToken(): string {
  return alphanumeric();
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
