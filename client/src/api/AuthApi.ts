import { ApiClient } from "./ApiClient";
import { AuthUser } from "../types";

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

export class AuthApi extends ApiClient {
  register(input: { name: string; email: string; password: string; profession?: string }) {
    return this.post<AuthResponse>("/auth/register", input);
  }

  login(input: { email: string; password: string }) {
    return this.post<AuthResponse>("/auth/login", input);
  }

  me() {
    return this.get<{ user: AuthUser }>("/auth/me");
  }
}
