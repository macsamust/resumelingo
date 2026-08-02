import bcrypt from "bcryptjs";
import { UserRepository } from "../repositories/UserRepository";
import { TokenService } from "./TokenService";
import { User } from "../models/User";

export class AuthError extends Error {}

/**
 * Same responsibilities as the Node/Express AuthService. The only real
 * change: no default constructor params. In Express, `new UserRepository()`
 * could open its own module-level SQLite connection; in a Worker, the D1
 * binding only exists inside a request, so every dependency is passed in
 * explicitly by `createServices()` per request.
 */
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: TokenService
  ) {}

  async register(input: { name: string; email: string; password: string; profession?: string }) {
    const existing = await this.users.findByEmail(input.email);
    if (existing) throw new AuthError("An account with that email already exists.");

    const passwordHash = await bcrypt.hash(input.password, 10);
    const record = await this.users.create({
      name: input.name,
      email: input.email,
      passwordHash,
      profession: input.profession ?? null,
    });
    const user = new User(record);
    const token = await this.tokens.sign({ userId: user.id, email: user.email });
    return { user, token };
  }

  async login(email: string, password: string) {
    const record = await this.users.findByEmail(email);
    if (!record) throw new AuthError("Invalid email or password.");

    const matches = await bcrypt.compare(password, record.passwordHash);
    if (!matches) throw new AuthError("Invalid email or password.");

    const user = new User(record);
    const token = await this.tokens.sign({ userId: user.id, email: user.email });
    return { user, token };
  }

  async getUserById(userId: string): Promise<User | undefined> {
    const record = await this.users.findById(userId);
    return record ? new User(record) : undefined;
  }

  verifyToken(token: string) {
    return this.tokens.verify(token);
  }
}
