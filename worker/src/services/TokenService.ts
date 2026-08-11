import { jwtVerify, SignJWT } from "jose";

/**
 * Workers-native replacement for the Node version's `jsonwebtoken`. Node's
 * `jsonwebtoken` package relies on Node's `crypto` module in ways that don't
 * map cleanly onto Workers; `jose` is built on the standard Web Crypto API
 * (`SubtleCrypto`), which Workers supports natively, so signing/verifying
 * works the same in local `wrangler dev` and in production.
 *
 * Generic over the payload shape (matching server/'s TokenService<T>) so
 * the same class backs both user auth (TokenService<AuthTokenPayload>) and
 * admin auth (TokenService<AdminTokenPayload>) with two separate secrets —
 * see createServices.ts — rather than a second near-duplicate class.
 */
export class TokenService<TPayload extends object> {
  constructor(private readonly secret: string, private readonly expiresIn: string = "7d") {
    if (!secret) throw new Error("JWT secret is not set (see .dev.vars / wrangler secret put JWT_SECRET / ADMIN_JWT_SECRET).");
  }

  private get key(): Uint8Array {
    return new TextEncoder().encode(this.secret);
  }

  async sign(payload: TPayload): Promise<string> {
    return new SignJWT({ ...payload } as Record<string, unknown>)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(this.expiresIn)
      .sign(this.key);
  }

  async verify(token: string): Promise<TPayload> {
    const { payload } = await jwtVerify(token, this.key);
    return payload as unknown as TPayload;
  }
}
