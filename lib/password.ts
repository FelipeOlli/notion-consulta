import crypto from "crypto";

const SCRYPT_KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt);
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, digestHex] = stored.split(":");
  if (!salt || !digestHex) return false;
  const derived = await scryptAsync(password, salt);
  const digest = Buffer.from(digestHex, "hex");
  if (digest.length !== derived.length) return false;
  return crypto.timingSafeEqual(digest, derived);
}

function scryptAsync(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, (error, key) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(key as Buffer);
    });
  });
}
