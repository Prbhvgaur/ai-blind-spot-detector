import { beforeEach, describe, expect, it, vi } from "vitest";

const googleIdentityMock = vi.hoisted(() => vi.fn());

vi.mock("../users/users.service", () => ({
  buildUserProfile: vi.fn(async (_prisma: unknown, userId: string) => ({
    id: userId,
    email: "founder@example.com",
    name: "Ada Founder",
    plan: "FREE",
    analysisCount: 1,
    remainingFreeAnalyses: 2,
    subscriptionStatus: null,
    subscriptionEndsAt: null
  }))
}));

vi.mock("../../lib/google", () => ({
  verifyGoogleIdToken: googleIdentityMock
}));

import { googleOAuthBodySchema, loginBodySchema, registerBodySchema } from "./auth.schema";
import {
  authenticateGoogleUser,
  clearRefreshCookie,
  hashPassword,
  loginUser,
  refreshSession,
  registerUser,
  revokeRefreshToken,
  setRefreshCookie,
  verifyPassword
} from "./auth.service";

const createReply = () => {
  const reply = {
    cookieCalls: [] as Array<{ name: string; value: string; options: Record<string, unknown> }>,
    clearCookieCalls: [] as Array<{ name: string; options: Record<string, unknown> }>,
    setCookie(name: string, value: string, options: Record<string, unknown>) {
      this.cookieCalls.push({ name, value, options });
      return this;
    },
    clearCookie(name: string, options: Record<string, unknown>) {
      this.clearCookieCalls.push({ name, options });
      return this;
    }
  };

  return reply;
};

const createFastify = () => {
  const refreshTokenStore = new Map<string, { token: string; userId: string; expiresAt: Date }>();
  const users = new Map<string, any>();

  const prisma = {
    user: {
      findUnique: vi.fn(
        async ({ where }: { where: { email?: string; googleId?: string } }) =>
          [...users.values()].find((user) =>
            where.email ? user.email === where.email : where.googleId ? user.googleId === where.googleId : false
          ) ?? null
      ),
      create: vi.fn(
        async ({
          data
        }: {
          data: { email: string; passwordHash?: string | null; googleId?: string | null; name: string | null };
        }) => {
          const created = {
            id: `user_${users.size + 1}`,
            email: data.email,
            passwordHash: data.passwordHash ?? null,
            googleId: data.googleId ?? null,
            name: data.name,
            plan: "FREE" as const
          };
          users.set(created.id, created);
          return created;
        }
      ),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const existing = users.get(where.id);

        if (!existing) {
          throw new Error("Record not found");
        }

        const updated = {
          ...existing,
          ...data
        };
        users.set(where.id, updated);
        return updated;
      })
    },
    refreshToken: {
      create: vi.fn(async ({ data }: { data: { token: string; userId: string; expiresAt: Date } }) => {
        refreshTokenStore.set(data.token, data);
        return data;
      }),
      findUnique: vi.fn(async ({ where: { token } }: { where: { token: string } }) => {
        const stored = refreshTokenStore.get(token);

        if (!stored) {
          return null;
        }

        const user = users.get(stored.userId);

        return user
          ? {
              ...stored,
              user
            }
          : null;
      }),
      delete: vi.fn(async ({ where: { token } }: { where: { token: string } }) => {
        refreshTokenStore.delete(token);
        return { token };
      }),
      deleteMany: vi.fn(async ({ where: { token } }: { where: { token: string } }) => {
        const deleted = refreshTokenStore.delete(token) ? 1 : 0;
        return { count: deleted };
      })
    }
  };

  return {
    fastify: {
      prisma,
      jwt: {
        sign: vi.fn(({ id, email, plan }: { id: string; email: string; plan: "FREE" | "PRO" }) =>
          `signed:${id}:${email}:${plan}`
        )
      },
      httpErrors: {
        conflict: (message: string) => new Error(message),
        unauthorized: (message: string) => new Error(message)
      }
    },
    prisma,
    users,
    refreshTokenStore
  };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("auth schemas", () => {
  it("accepts a valid registration payload", () => {
    const payload = registerBodySchema.parse({
      email: "founder@example.com",
      password: "supersecure123",
      name: "Ada Founder"
    });

    expect(payload.email).toBe("founder@example.com");
  });

  it("rejects a short password", () => {
    expect(() =>
      loginBodySchema.parse({
        email: "founder@example.com",
        password: "short"
      })
    ).toThrow();
  });

  it("accepts a Google OAuth payload", () => {
    expect(
      googleOAuthBodySchema.parse({
        idToken: "g".repeat(120)
      })
    ).toEqual({
      idToken: "g".repeat(120)
    });
  });
});

describe("auth password hashing", () => {
  it("hashes and verifies passwords with argon2id", async () => {
    const hash = await hashPassword("supersecure123");
    await expect(verifyPassword(hash, "supersecure123")).resolves.toBe(true);
    await expect(verifyPassword(hash, "not-the-same")).resolves.toBe(false);
  });
});

describe("auth cookies", () => {
  it("sets the refresh token cookie with secure defaults", () => {
    const reply = createReply();

    setRefreshCookie(reply, "refresh-token-value");

    expect(reply.cookieCalls).toHaveLength(1);
    expect(reply.cookieCalls[0]?.name).toBe("blindspot_refresh");
    expect(reply.cookieCalls[0]?.value).toBe("refresh-token-value");
    expect(reply.cookieCalls[0]?.options.httpOnly).toBe(true);
    expect(reply.cookieCalls[0]?.options.sameSite).toBe("lax");
  });

  it("clears the refresh token cookie on logout", () => {
    const reply = createReply();

    clearRefreshCookie(reply);

    expect(reply.clearCookieCalls).toEqual([
      {
        name: "blindspot_refresh",
        options: { path: "/" }
      }
    ]);
  });
});

describe("auth service", () => {
  it("registers a new user and returns auth payload", async () => {
    const { fastify, users, refreshTokenStore } = createFastify();

    const payload = await registerUser(fastify, {
      email: "Founder@Example.com",
      password: "supersecure123",
      name: "Ada Founder"
    });

    expect(payload.accessToken).toContain("signed:user_1:founder@example.com:FREE");
    expect(payload.refreshToken).toHaveLength(96);
    expect(users.get("user_1")?.email).toBe("founder@example.com");
    expect(refreshTokenStore.size).toBe(1);
  });

  it("rejects duplicate registrations", async () => {
    const { fastify, users } = createFastify();
    users.set("user_1", {
      id: "user_1",
      email: "founder@example.com",
      passwordHash: "hash",
      name: "Ada Founder",
      plan: "FREE"
    });

    await expect(
      registerUser(fastify, {
        email: "founder@example.com",
        password: "supersecure123"
      })
    ).rejects.toThrow("An account with that email already exists");
  });

  it("logs in an existing user with a valid password", async () => {
    const { fastify, users } = createFastify();
    const passwordHash = await hashPassword("supersecure123");

    users.set("user_1", {
      id: "user_1",
      email: "founder@example.com",
      passwordHash,
      name: "Ada Founder",
      plan: "FREE"
    });

    const payload = await loginUser(fastify, {
      email: "Founder@Example.com",
      password: "supersecure123"
    });

    expect(payload.accessToken).toContain("signed:user_1:founder@example.com:FREE");
    expect(payload.user.id).toBe("user_1");
  });

  it("rejects login when credentials do not match", async () => {
    const { fastify, users } = createFastify();
    const passwordHash = await hashPassword("supersecure123");

    users.set("user_1", {
      id: "user_1",
      email: "founder@example.com",
      passwordHash,
      name: "Ada Founder",
      plan: "FREE"
    });

    await expect(
      loginUser(fastify, {
        email: "founder@example.com",
        password: "wrong-password"
      })
    ).rejects.toThrow("Invalid email or password");
  });

  it("rejects password login for Google-only accounts", async () => {
    const { fastify, users } = createFastify();
    users.set("user_1", {
      id: "user_1",
      email: "founder@example.com",
      passwordHash: null,
      googleId: "google-user-1",
      name: "Ada Founder",
      plan: "FREE"
    });

    await expect(
      loginUser(fastify, {
        email: "founder@example.com",
        password: "supersecure123"
      })
    ).rejects.toThrow("This account uses Google sign-in. Continue with Google to access it.");
  });

  it("creates a user from a verified Google account", async () => {
    const { fastify, users, refreshTokenStore } = createFastify();
    googleIdentityMock.mockResolvedValue({
      sub: "google-user-1",
      email: "Founder@Example.com",
      name: "Ada Founder",
      emailVerified: true
    });

    const payload = await authenticateGoogleUser(fastify, {
      idToken: "g".repeat(120)
    });

    expect(users.get("user_1")).toMatchObject({
      email: "founder@example.com",
      passwordHash: null,
      googleId: "google-user-1",
      name: "Ada Founder"
    });
    expect(payload.user.id).toBe("user_1");
    expect(refreshTokenStore.size).toBe(1);
  });

  it("links a verified Google account to an existing email account", async () => {
    const { fastify, users } = createFastify();
    const passwordHash = await hashPassword("supersecure123");
    users.set("user_1", {
      id: "user_1",
      email: "founder@example.com",
      passwordHash,
      googleId: null,
      name: null,
      plan: "FREE"
    });
    googleIdentityMock.mockResolvedValue({
      sub: "google-user-1",
      email: "founder@example.com",
      name: "Ada Founder",
      emailVerified: true
    });

    const payload = await authenticateGoogleUser(fastify, {
      idToken: "g".repeat(120)
    });

    expect(users.get("user_1")).toMatchObject({
      googleId: "google-user-1",
      name: "Ada Founder"
    });
    expect(payload.user.id).toBe("user_1");
  });

  it("rejects Google accounts with unverified email addresses", async () => {
    const { fastify } = createFastify();
    googleIdentityMock.mockResolvedValue({
      sub: "google-user-1",
      email: "founder@example.com",
      name: "Ada Founder",
      emailVerified: false
    });

    await expect(
      authenticateGoogleUser(fastify, {
        idToken: "g".repeat(120)
      })
    ).rejects.toThrow("Google account email is not verified");
  });

  it("refreshes a session when the refresh token is valid", async () => {
    const { fastify, refreshTokenStore } = createFastify();

    const issued = await registerUser(fastify, {
      email: "founder@example.com",
      password: "supersecure123",
      name: "Ada Founder"
    });

    const refreshed = await refreshSession(fastify, issued.refreshToken);

    expect(refreshed.accessToken).toContain("signed:user_1:founder@example.com:FREE");
    expect(refreshTokenStore.size).toBe(1);
    expect([...refreshTokenStore.keys()][0]).not.toBe(issued.refreshToken);
  });

  it("rejects refresh tokens that are missing or expired", async () => {
    const { fastify, users, refreshTokenStore } = createFastify();
    users.set("user_1", {
      id: "user_1",
      email: "founder@example.com",
      passwordHash: "hash",
      name: "Ada Founder",
      plan: "FREE"
    });

    refreshTokenStore.set("expired-token-hash", {
      token: "expired-token-hash",
      userId: "user_1",
      expiresAt: new Date(Date.now() - 60_000)
    });

    await expect(refreshSession(fastify, "missing-token")).rejects.toThrow("Invalid refresh token");
    await expect(refreshSession(fastify, "expired-token-hash")).rejects.toThrow("Invalid refresh token");
  });

  it("revokes refresh tokens when present and no-ops otherwise", async () => {
    const { fastify, refreshTokenStore } = createFastify();
    refreshTokenStore.set("some-token", {
      token: "some-token",
      userId: "user_1",
      expiresAt: new Date(Date.now() + 60_000)
    });

    await expect(revokeRefreshToken(fastify)).resolves.toBeUndefined();
    await revokeRefreshToken(fastify, "some-token");

    expect(fastify.prisma.refreshToken.deleteMany).toHaveBeenCalledTimes(1);
  });
});
