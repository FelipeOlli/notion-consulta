import crypto from "crypto";
import { cookies } from "next/headers";
import type { AppModule } from "@/lib/modules";

const SESSION_COOKIE = "nc_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

export type SessionRole = "master";

export type SessionPayload = {
  email: string;
  userId?: string;
  modules?: AppModule[];
  exp: number;
  role?: SessionRole;
};

function getSessionSecret(): string {
  const secret = process.env.AUTH_SECRET || "";
  if (secret.length < 24) {
    throw new Error("AUTH_SECRET must have at least 24 characters.");
  }
  return secret;
}

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf-8").toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf-8");
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

/** Valida assinatura sem lançar (ex.: AUTH_SECRET inválido ou cookie legado). */
function safeSign(payload: string): string | null {
  try {
    return sign(payload);
  } catch {
    return null;
  }
}

export function createSessionToken(input: {
  email: string;
  userId?: string;
  modules?: AppModule[];
  role?: SessionRole;
}): string {
  const payload: SessionPayload = {
    email: input.email,
    userId: input.userId,
    modules: input.modules ?? [],
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    role: input.role,
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function validateSessionToken(token: string): SessionPayload | null {
  try {
    const [payloadPart, signaturePart] = token.split(".");
    if (!payloadPart || !signaturePart) return null;

    const expectedSignature = safeSign(payloadPart);
    if (!expectedSignature) return null;
    if (signaturePart.length !== expectedSignature.length) {
      return null;
    }
    if (!crypto.timingSafeEqual(Buffer.from(signaturePart), Buffer.from(expectedSignature))) {
      return null;
    }

    const parsed = JSON.parse(fromBase64Url(payloadPart)) as SessionPayload;
    if (!parsed.email || typeof parsed.exp !== "number") return null;
    if (Math.floor(Date.now() / 1000) > parsed.exp) return null;
    if (!Array.isArray(parsed.modules)) parsed.modules = [];
    return parsed;
  } catch {
    return null;
  }
}

export async function getAdminSession() {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    return validateSessionToken(token);
  } catch {
    return null;
  }
}

export const sessionCookieConfig = {
  name: SESSION_COOKIE,
  maxAge: SESSION_TTL_SECONDS,
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};
