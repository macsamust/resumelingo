import bcrypt from "bcryptjs";
import { UserRepository } from "../repositories/UserRepository";
import { TokenService } from "./TokenService";
import { User } from "../models/User";

export class AuthError extends Error {}

export class AuthService {
  constructor(
    private readonly users: UserRepository = new UserRepository(),
    private readonly tokens: TokenService = new TokenService()
  ) {}

  async register(input: { name: string; email: string; password: string; profession?: string }) {
    const existing = this.users.findByEmail(input.email);
    if (existing) throw new AuthError("An account with that email already exists.");

    const passwordHash = await bcrypt.hash(input.password, 10);
    const record = this.users.create({
      name: input.name,
      email: input.email,
      passwordHash,
      profession: input.profession ?? null,
    });
    const user = new User(record);
    const token = this.tokens.sign({ userId: user.id, email: user.email });
    return { user, token };
  }

  async login(email: string, password: string) {
    const record = this.users.findByEmail(email);
    if (!record) throw new AuthError("Invalid email or password.");

    const matches = await bcrypt.compare(password, record.passwordHash);
    if (!matches) throw new AuthError("Invalid email or password.");

    const user = new User(record);
    const token = this.tokens.sign({ userId: user.id, email: user.email });
    return { user, token };
  }

  getUserById(userId: string): User | undefined {
    const record = this.users.findById(userId);
    return record ? new User(record) : undefined;
  }

  verifyToken(token: string) {
    return this.tokens.verify(token);
  }
}
