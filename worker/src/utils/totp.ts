/**
 * Minimal RFC 6238 TOTP (and RFC 4226 HOTP underneath it) implementation on
 * the Web Crypto API — no npm dependency. Every popular TOTP library
 * (otplib, speakeasy, etc.) either pulls in Node's `crypto` module directly
 * or wraps it, which doesn't map cleanly onto the Workers runtime the same
 * way `jsonwebtoken` didn't (see TokenService.ts's doc comment for the
 * established precedent of hand-rolling/swapping crypto for Web Crypto
 * compatibility in this codebase, rather than fighting a Node-shaped
 * dependency). TOTP itself is a small, stable, fully-specified algorithm —
 * a good candidate to just implement directly instead.
 *
 * Standard parameters throughout: SHA-1 (yes, SHA-1 — this is what every
 * authenticator app, including Google Authenticator/Authy/1Password,
 * expects for TOTP; it's not a weakness here since TOTP's security comes
 * from the shared secret and short validity window, not from SHA-1's
 * collision resistance), 6 digits, 30-second step.
 */

const DIGITS = 6;
const STEP_SECONDS = 30;
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Random 20-byte (160-bit) secret, base32-encoded — the standard size every authenticator app expects. */
export function generateTotpSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return base32Encode(bytes);
}

function base32Encode(bytes: Uint8Array): string {
  let bits = "";
  for (const byte of bytes) bits += byte.toString(2).padStart(8, "0");
  let output = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    output += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  }
  // Any leftover bits (< 5) are padding zero-bits with no representable
  // value, per RFC 4648 — dropped rather than encoded, standard for base32
  // of a byte length that isn't a multiple of 5.
  return output;
}

function base32Decode(value: string): Uint8Array {
  const cleaned = value.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const char of cleaned) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return new Uint8Array(bytes);
}

/** RFC 4226 HOTP — the counter-based primitive TOTP (below) is built on. */
async function hotp(secret: Uint8Array, counter: number): Promise<string> {
  const counterBytes = new ArrayBuffer(8);
  const view = new DataView(counterBytes);
  // Counter is a 64-bit big-endian integer per the RFC; JS numbers are only
  // safe up to 2^53, but a Unix-time-based counter won't approach that for
  // a very, very long time, so splitting into two 32-bit halves is enough.
  view.setUint32(4, counter);
  view.setUint32(0, Math.floor(counter / 2 ** 32));

  const key = await crypto.subtle.importKey("raw", secret as BufferSource, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, counterBytes));

  // Dynamic truncation (RFC 4226 §5.3): take a 4-byte chunk starting at an
  // offset given by the low nibble of the signature's last byte, mask off
  // the top bit, then reduce mod 10^digits.
  const offset = signature[signature.length - 1] & 0x0f;
  const binCode =
    ((signature[offset] & 0x7f) << 24) | ((signature[offset + 1] & 0xff) << 16) | ((signature[offset + 2] & 0xff) << 8) | (signature[offset + 3] & 0xff);
  const code = binCode % 10 ** DIGITS;
  return code.toString().padStart(DIGITS, "0");
}

/** The current 6-digit code for `secret` (base32), at `atTimeMs` (defaults to now). */
async function totpAt(secret: string, atTimeMs: number): Promise<string> {
  const counter = Math.floor(atTimeMs / 1000 / STEP_SECONDS);
  return hotp(base32Decode(secret), counter);
}

/**
 * Checks `code` against the current time step and one step on either side
 * (±30s) — a small clock-drift/entry-delay allowance, standard practice for
 * TOTP verification (this is what "30 second window" means in most
 * authenticator UX, not a security weakness — it's still only 3 valid
 * codes at any moment, same order of magnitude as the base 30s window).
 */
export async function verifyTotp(secret: string, code: string, atTimeMs: number = Date.now()): Promise<boolean> {
  const trimmed = code.trim();
  if (!/^\d{6}$/.test(trimmed)) return false;
  for (const stepOffset of [0, -1, 1]) {
    const candidate = await totpAt(secret, atTimeMs + stepOffset * STEP_SECONDS * 1000);
    if (candidate === trimmed) return true;
  }
  return false;
}

/** `otpauth://` URI an authenticator app can import directly (via QR code or manual paste) to enroll this secret. */
export function buildOtpAuthUri(secret: string, accountEmail: string): string {
  const issuer = "ResumeLingo";
  const label = encodeURIComponent(`${issuer}:${accountEmail}`);
  const params = new URLSearchParams({ secret, issuer, algorithm: "SHA1", digits: String(DIGITS), period: String(STEP_SECONDS) });
  return `otpauth://totp/${label}?${params.toString()}`;
}

// Excludes 0/O and 1/I/L — visually ambiguous characters a backup code
// shouldn't have, since these are meant to be hand-typed from a printed/
// saved copy, not scanned.
const BACKUP_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** One human-typeable one-time backup code, formatted "XXXX-XXXX" — see AdminService's enrollment flow for why these exist (recovery path if the authenticator device is lost). */
export function generateBackupCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const chars = Array.from(bytes, (b) => BACKUP_CODE_ALPHABET[b % BACKUP_CODE_ALPHABET.length]).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}`;
}
