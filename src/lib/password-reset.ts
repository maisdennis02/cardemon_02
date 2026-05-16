import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

// We store password-reset tokens in the existing VerificationToken table, with
// a namespaced identifier so they can't be confused with future flows (email
// verification, magic links, etc.). The raw token is only ever in the email
// URL; what we store is its SHA-256 digest — a DB dump alone isn't enough to
// take over an account.
const IDENTIFIER_PREFIX = "password-reset:";
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function identifierFor(userId: string): string {
  return `${IDENTIFIER_PREFIX}${userId}`;
}

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export async function issuePasswordResetToken(userId: string): Promise<string> {
  // Invalidate any outstanding tokens for this user — one live token at a time.
  await prisma.verificationToken.deleteMany({
    where: { identifier: identifierFor(userId) },
  });

  const rawToken = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await prisma.verificationToken.create({
    data: {
      identifier: identifierFor(userId),
      token: hashToken(rawToken),
      expires,
    },
  });

  return rawToken;
}

export type ResetTokenLookup =
  | { ok: true; userId: string }
  | { ok: false; reason: "invalid" | "expired" };

export async function lookupPasswordResetToken(rawToken: string): Promise<ResetTokenLookup> {
  if (!rawToken) return { ok: false, reason: "invalid" };

  const record = await prisma.verificationToken.findUnique({
    where: { token: hashToken(rawToken) },
  });
  if (!record) return { ok: false, reason: "invalid" };
  if (!record.identifier.startsWith(IDENTIFIER_PREFIX)) {
    return { ok: false, reason: "invalid" };
  }
  if (record.expires.getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  const userId = record.identifier.slice(IDENTIFIER_PREFIX.length);
  return { ok: true, userId };
}

export async function consumePasswordResetToken(rawToken: string): Promise<void> {
  await prisma.verificationToken.deleteMany({
    where: { token: hashToken(rawToken) },
  });
}
