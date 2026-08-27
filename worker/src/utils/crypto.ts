/**
 * Small Web Crypto helpers shared across services that need hashing or
 * random tokens — extracted out of AuthService.ts (which had its own
 * private copies) once AdminAuditLogRepository's hash chaining and the TOTP
 * 2FA work needed the exact same two primitives. Unlike the tolerant-JSON-
 * parsing helpers duplicated across the AI services (ContentGenerator,
 * CareerCoachGenerator, etc. — kept separate since each has its own error
 * types), these are genuinely identical logic with no per-caller variation,
 * so sharing them is the right call.
 */

/** Random hex string of `byteLength` bytes (so a 32-byte call returns a 64-character string) — cryptographically strong, via the Web Crypto API. */
export function randomHex(byteLength: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** SHA-256 hex digest of a UTF-8 string. */
export async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
