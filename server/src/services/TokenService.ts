import jwt from "jsonwebtoken";
import { AuthTokenPayload } from "../types";

/**
 * Generic so AdminService can reuse this with AdminTokenPayload and its own
 * secret (ADMIN_JWT_SECRET) — keeping admin tokens structurally and
 * cryptographically distinct from regular user tokens, so one can never be
 * mistaken for or replayed as the other.
 */
export class TokenService<TPayload extends object = AuthTokenPayload> {
  private readonly secret: string;
  private readonly expiresIn: string;

  constructor(secret = process.env.JWT_SECRET || "dev-secret", expiresIn = "7d") {
    this.secret = secret;
    this.expiresIn = expiresIn;
  }

  sign(payload: TPayload): string {
    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn as jwt.SignOptions["expiresIn"] });
  }

  verify(token: string): TPayload {
    return jwt.verify(token, this.secret) as TPayload;
  }
}
