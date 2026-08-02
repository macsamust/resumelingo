import { jwtVerify, SignJWT } from "jose";
import { AuthTokenPayload } from "../types";

/**
 * Workers-native replacement for the Node version's `jsonwebtoken`. Node's
 * `jsonwebtoken` package relies on Node's `crypto` module in ways that don't
 * map cleanly onto Workers; `jose` is built on the standard Web Crypto API
 * (`SubtleCrypto`), which Workers supports natively, so signing/verifying
 * works the same in local `wrangler dev` and in production.
 */
export class TokenService {
  constructor(private readonly secret: string, private readonly expiresIn: string = "7d") {
    if (!secret) throw new Error("JWT_SECRET is not set (see .dev.vars / wrangler secret put JWT_SECRET).");
  }

  private get key(): Uint8Array {
    return new TextEncoder().encode(this.secret);
  }

  async sign(payload: AuthTokenPayload): Promise<string> {
    return new SignJWT({ ...payload })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(this.expiresIn)
      .sign(this.key);
  }

  async verify(token: string): Promise<AuthTokenPayload> {
    const { payload } = await jwtVerify(token, this.key);
    return payload as unknown as AuthTokenPayload;
  }
}
