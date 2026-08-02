// Server-only utilities — do NOT import this in client components
import { nanoid } from "nanoid";
import { createHash } from "crypto";

export function generateId(): string {
  return nanoid();
}

export function generateToken(): string {
  return nanoid(32);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
