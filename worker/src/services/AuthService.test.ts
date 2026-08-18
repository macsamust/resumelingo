import { describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { AuthError, AuthService, InvalidResetTokenError } from "./AuthService";
import { SubscriptionTier, UserRecord, AuthTokenPayload } from "../types";
import { UserRepository } from "../repositories/UserRepository";
import { TokenService } from "./TokenService";
import { EmailService } from "./EmailService";

function makeUserRecord(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: "user-1",
    name: "Jordan Lee",
    email: "jordan@example.com",
    passwordHash: "",
    profession: null,
    subscriptionTier: SubscriptionTier.Starter,
    suspended: false,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    createdAt: new Date().toISOString(),
    resetTokenHash: null,
    resetTokenExpiresAt: null,
    ...overrides,
  };
}

/**
 * Mocks just the methods AuthService actually calls, rather than a real
 * UserRepository — that class talks to a D1 binding, which doesn't exist
 * outside a Worker/wrangler runtime. See server/src/services/
 * AuthService.test.ts for the Postgres-backend equivalent of every case
 * here; the two are meant to behave identically.
 */
function makeUsersMock(overrides: Partial<UserRepository> = {}) {
  return {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updatePasswordHash: vi.fn(),
    setResetToken: vi.fn(),
    findByResetTokenHash: vi.fn(),
    resetPassword: vi.fn(),
    ...overrides,
  } as unknown as UserRepository;
}

function makeTokensMock() {
  // Unlike server's jsonwebtoken-based TokenService (sync), worker's is
  // jose-based and async (see TokenService.ts) — the mock's sign() returns
  // a resolved Promise to match. Typed with a rest-args implementation so
  // Vitest doesn't narrow the inferred call-args type — this mock's calls
  // get asserted with toHaveBeenCalledWith below.
  return {
    sign: vi.fn(async (..._args: unknown[]) => "signed-token"),
    verify: vi.fn(),
  } as unknown as TokenService<AuthTokenPayload>;
}

function makeEmailMock() {
  return { sendPasswordResetEmail: vi.fn(async () => {}) } as unknown as EmailService;
}

describe("AuthService.register", () => {
  it("throws if the email is already registered", async () => {
    const users = makeUsersMock({ findByEmail: vi.fn(async () => makeUserRecord()) } as never);
    const service = new AuthService(users, makeTokensMock(), makeEmailMock(), "http://localhost:5173");
    await expect(service.register({ name: "A", email: "jordan@example.com", password: "password123" })).rejects.toThrow(
      AuthError
    );
  });

  it("creates a user and returns a signed token when the email is free", async () => {
    const created = makeUserRecord({ passwordHash: "hashed" });
    const users = makeUsersMock({
      findByEmail: vi.fn(async () => undefined),
      create: vi.fn(async () => created),
    } as never);
    const tokens = makeTokensMock();
    const service = new AuthService(users, tokens, makeEmailMock(), "http://localhost:5173");
    const { user, token } = await service.register({ name: "Jordan Lee", email: "jordan@example.com", password: "password123" });
    expect(user.email).toBe("jordan@example.com");
    expect(token).toBe("signed-token");
    expect(tokens.sign).toHaveBeenCalledWith({ userId: created.id, email: created.email });
  });
});

describe("AuthService.login", () => {
  it("throws for an unknown email", async () => {
    const users = makeUsersMock({ findByEmail: vi.fn(async () => undefined) } as never);
    const service = new AuthService(users, makeTokensMock(), makeEmailMock(), "http://localhost:5173");
    await expect(service.login("nobody@example.com", "password123")).rejects.toThrow(AuthError);
  });

  it("throws for a wrong password", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 4);
    const users = makeUsersMock({ findByEmail: vi.fn(async () => makeUserRecord({ passwordHash })) } as never);
    const service = new AuthService(users, makeTokensMock(), makeEmailMock(), "http://localhost:5173");
    await expect(service.login("jordan@example.com", "wrong-password")).rejects.toThrow(AuthError);
  });

  it("throws for a suspended account even with the correct password", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 4);
    const users = makeUsersMock({
      findByEmail: vi.fn(async () => makeUserRecord({ passwordHash, suspended: true })),
    } as never);
    const service = new AuthService(users, makeTokensMock(), makeEmailMock(), "http://localhost:5173");
    await expect(service.login("jordan@example.com", "correct-password")).rejects.toThrow(
      "This account has been suspended. Contact support for help."
    );
  });

  it("succeeds and returns a token for the correct password on an active account", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 4);
    const users = makeUsersMock({ findByEmail: vi.fn(async () => makeUserRecord({ passwordHash })) } as never);
    const service = new AuthService(users, makeTokensMock(), makeEmailMock(), "http://localhost:5173");
    const { user, token } = await service.login("jordan@example.com", "correct-password");
    expect(user.email).toBe("jordan@example.com");
    expect(token).toBe("signed-token");
  });
});

describe("AuthService.changePassword", () => {
  it("throws if the current password is wrong", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 4);
    const users = makeUsersMock({ findById: vi.fn(async () => makeUserRecord({ passwordHash })) } as never);
    const service = new AuthService(users, makeTokensMock(), makeEmailMock(), "http://localhost:5173");
    await expect(service.changePassword("user-1", "wrong-password", "new-password123")).rejects.toThrow(
      "Current password is incorrect."
    );
  });

  it("updates the password hash when the current password is correct", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 4);
    const updatePasswordHash = vi.fn(async (..._args: unknown[]) => {});
    const users = makeUsersMock({
      findById: vi.fn(async () => makeUserRecord({ passwordHash })),
      updatePasswordHash,
    } as never);
    const service = new AuthService(users, makeTokensMock(), makeEmailMock(), "http://localhost:5173");
    await service.changePassword("user-1", "correct-password", "new-password123");
    expect(updatePasswordHash).toHaveBeenCalledWith("user-1", expect.any(String));
  });
});

describe("AuthService.requestPasswordReset", () => {
  it("resolves silently and sends no email when the address doesn't match an account", async () => {
    const sendPasswordResetEmail = vi.fn(async () => {});
    const users = makeUsersMock({ findByEmail: vi.fn(async () => undefined) } as never);
    const service = new AuthService(users, makeTokensMock(), { sendPasswordResetEmail } as unknown as EmailService, "http://localhost:5173");
    await expect(service.requestPasswordReset("nobody@example.com")).resolves.toBeUndefined();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("stores a token hash and emails a reset link when the address matches an account", async () => {
    const setResetToken = vi.fn(async (..._args: unknown[]) => {});
    const sendPasswordResetEmail = vi.fn(async (..._args: unknown[]) => {});
    const users = makeUsersMock({
      findByEmail: vi.fn(async () => makeUserRecord()),
      setResetToken,
    } as never);
    const service = new AuthService(
      users,
      makeTokensMock(),
      { sendPasswordResetEmail } as unknown as EmailService,
      "http://localhost:5173"
    );
    await service.requestPasswordReset("jordan@example.com");

    // SHA-256 hex string — the raw token itself is never stored, only its hash.
    expect(setResetToken).toHaveBeenCalledWith("user-1", expect.stringMatching(/^[0-9a-f]{64}$/), expect.any(String));
    const expiresAtArg = setResetToken.mock.calls[0]?.[2] as string;
    expect(new Date(expiresAtArg).getTime()).toBeGreaterThan(Date.now());

    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      "jordan@example.com",
      expect.stringMatching(/^http:\/\/localhost:5173\/reset-password\?token=[0-9a-f]{64}$/)
    );
  });
});

describe("AuthService.resetPassword", () => {
  it("throws InvalidResetTokenError when no user matches the token", async () => {
    const users = makeUsersMock({ findByResetTokenHash: vi.fn(async () => undefined) } as never);
    const service = new AuthService(users, makeTokensMock(), makeEmailMock(), "http://localhost:5173");
    await expect(service.resetPassword("some-token", "new-password123")).rejects.toThrow(InvalidResetTokenError);
  });

  it("throws InvalidResetTokenError when the token has expired", async () => {
    const expired = new Date(Date.now() - 1000).toISOString();
    const users = makeUsersMock({
      findByResetTokenHash: vi.fn(async () => makeUserRecord({ resetTokenHash: "irrelevant", resetTokenExpiresAt: expired })),
    } as never);
    const service = new AuthService(users, makeTokensMock(), makeEmailMock(), "http://localhost:5173");
    await expect(service.resetPassword("some-token", "new-password123")).rejects.toThrow(InvalidResetTokenError);
  });

  it("sets the new password and clears the token when it's valid and unexpired", async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const resetPassword = vi.fn(async (..._args: unknown[]) => {});
    const users = makeUsersMock({
      findByResetTokenHash: vi.fn(async () => makeUserRecord({ resetTokenHash: "irrelevant", resetTokenExpiresAt: future })),
      resetPassword,
    } as never);
    const service = new AuthService(users, makeTokensMock(), makeEmailMock(), "http://localhost:5173");
    await service.resetPassword("some-token", "new-password123");
    expect(resetPassword).toHaveBeenCalledWith("user-1", expect.any(String));
  });
});
