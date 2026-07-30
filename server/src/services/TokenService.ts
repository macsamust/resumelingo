import jwt from "jsonwebtoken";
import { AuthTokenPayload } from "../types";

export class TokenService {
  private readonly secret: string;
  private readonly expiresIn: string;

  constructor(secret = process.env.JWT_SECRET || "dev-secret", expiresIn = "7d") {
    this.secret = secret;
    this.expiresIn = expiresIn;
  }

  sign(payload: AuthTokenPayload): string {
    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn as jwt.SignOptions["expiresIn"] });
  }

  verify(token: string): AuthTokenPayload {
    return jwt.verify(token, this.secret) as AuthTokenPayload;
  }
}
