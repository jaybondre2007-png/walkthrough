import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const key = crypto.scryptSync(
  process.env.JWT_SECRET ?? "dev-secret-change-me",
  "walkthrough-2fa-secret-encryption",
  32
);

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

/** Decrypts a value encrypted with `encrypt`. Falls back to returning the
 * input unchanged if it isn't valid ciphertext, so 2FA secrets stored before
 * encryption was introduced keep working instead of locking users out. */
export function decrypt(value: string): string {
  try {
    const buf = Buffer.from(value, "base64");
    const iv = buf.subarray(0, 12);
    const authTag = buf.subarray(12, 28);
    const ciphertext = buf.subarray(28);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    return value;
  }
}
