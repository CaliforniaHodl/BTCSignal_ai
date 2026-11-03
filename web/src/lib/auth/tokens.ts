import { createHash, randomBytes } from "node:crypto";

/** Opaque bearer tokens: random, base64url. Only their SHA-256 is ever stored. */
export const newToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
export const hashToken = (t: string) => createHash("sha256").update(t).digest("base64url");

/** Human-friendly recovery code: BTCS-XXXX-XXXX-XXXX-XXXX (Crockford base32, ~80 bits). */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export function newRecoveryCode() {
  const bytes = randomBytes(16);
  let out = "";
  for (let i = 0; i < 16; i++) out += ALPHABET[bytes[i] & 31];
  return `BTCS-${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}-${out.slice(12, 16)}`;
}
/** Normalise user input: case, spaces, dashes, and the ambiguous O/I/L. */
export function normaliseRecoveryCode(input: string) {
  const raw = input.toUpperCase().replace(/[^0-9A-Z]/g, "").replace(/^BTCS/, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  if (raw.length !== 16 || [...raw].some((c) => !ALPHABET.includes(c))) return null;
  return `BTCS-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}
