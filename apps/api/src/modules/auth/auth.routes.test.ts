import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  registerUserMock: vi.fn(),
  loginUserMock: vi.fn(),
  authenticateGoogleUserMock: vi.fn(),
  refreshSessionMock: vi.fn(),
  revokeRefreshTokenMock: vi.fn(),
  setRefreshCookieMock: vi.fn(),
  clearRefreshCookieMock: vi.fn(),
  buildUserProfileMock: vi.fn()
}));

vi.mock("./auth.service", () => ({
  registerUser: mocks.registerUserMock,
  loginUser: mocks.loginUserMock,
  authenticateGoogleUser: mocks.authenticateGoogleUserMock,
  refreshSession: mocks.refreshSessionMock,
  revokeRefreshToken: mocks.revokeRefreshTokenMock,
  setRefreshCookie: mocks.setRefreshCookieMock,
  clearRefreshCookie: mocks.clearRefreshCookieMock
}));

vi.mock("../users/users.service", () => ({
  buildUserProfile: mocks.buildUserProfileMock
}));

vi.mock("../../middleware/requireAuth", () => ({
  requireAuth: vi.fn(async () => undefined)
}));

import { authRoutes } from "./auth.routes";

type RegisteredRoute = {
  options: any;
  handler: any;
};

const createReply = () => {
  const reply = {
    statusCode: 200,
    body: undefined as unknown,
    code(code: number) {
      this.statusCode = code;
      return this;
    },
    send(payload: unknown) {
      this.body = payload;
      return this;
    }
  };

  return reply;
};

const createApp = () => {
  const routes = new Map<string, RegisteredRoute>();

  const app = {
    prisma: {},
    applyRateLimit: vi.fn(async () => undefined),
    post: vi.fn((path: string, options: any, handler: any) => {
      routes.set(`POST ${path}`, { options, handler });
    }),
    get: vi.fn((path: string, options: any, handler: any) => {
      routes.set(`GET ${path}`, { options, handler });
    })
  };

  return { app, routes };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("auth routes", () => {
  it("registers all expected auth endpoints", async () => {
    const { app, routes } = createApp();

    await authRoutes(app);

    expect(app.post).toHaveBeenCalledTimes(5);
    expect(app.get).toHaveBeenCalledTimes(1);
    expect(routes.has("POST /api/auth/register")).toBe(true);
    expect(routes.has("POST /api/auth/login")).toBe(true);
    expect(routes.has("POST /api/auth/oauth/google")).toBe(true);
    expect(routes.has("POST /api/auth/refresh")).toBe(true);
    expect(routes.has("POST /api/auth/logout")).toBe(true);
    expect(routes.has("GET /api/auth/me")).toBe(true);
  });

  it("handles registration requests", async () => {
    const { app, routes } = createApp();
    mocks.registerUserMock.mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      user: { id: "user_1" }
    });

    await authRoutes(app);

    const route = routes.get("POST /api/auth/register");
    const reply = createReply();

    await route?.handler({ body: { email: "founder@example.com", password: "supersecure123" } }, reply);

    expect(mocks.registerUserMock).toHaveBeenCalledWith(app, {
      email: "founder@example.com",
      password: "supersecure123"
    });
    expect(mocks.setRefreshCookieMock).toHaveBeenCalledWith(reply, "refresh-token");
    expect(reply.statusCode).toBe(201);
    expect(reply.body).toEqual({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      user: { id: "user_1" }
    });
  });

  it("runs the registration rate-limit prehandler", async () => {
    const { app, routes } = createApp();

    await authRoutes(app);

    const route = routes.get("POST /api/auth/register");
    const request = { ip: "127.0.0.1" };
    const reply = createReply();

    await route?.options.preHandler(request, reply);

    expect(app.applyRateLimit).toHaveBeenCalledWith(request, reply);
  });

  it("handles login requests", async () => {
    const { app, routes } = createApp();
    mocks.loginUserMock.mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      user: { id: "user_1" }
    });

    await authRoutes(app);

    const route = routes.get("POST /api/auth/login");
    const reply = createReply();

    await route?.handler({ body: { email: "founder@example.com", password: "supersecure123" } }, reply);

    expect(mocks.loginUserMock).toHaveBeenCalledWith(app, {
      email: "founder@example.com",
      password: "supersecure123"
    });
    expect(mocks.setRefreshCookieMock).toHaveBeenCalledWith(reply, "refresh-token");
    expect(reply.body).toEqual({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      user: { id: "user_1" }
    });
  });

  it("runs the login and refresh/logout rate-limit prehandlers", async () => {
    const { app, routes } = createApp();
    const request = { body: {}, cookies: {} };
    const reply = createReply();

    await authRoutes(app);

    await routes.get("POST /api/auth/login")?.options.preHandler(request, reply);
    await routes.get("POST /api/auth/oauth/google")?.options.preHandler(request, reply);
    await routes.get("POST /api/auth/refresh")?.options.preHandler(request, reply);
    await routes.get("POST /api/auth/logout")?.options.preHandler(request, reply);

    expect(app.applyRateLimit).toHaveBeenCalledTimes(4);
    expect(app.applyRateLimit).toHaveBeenNthCalledWith(1, request, reply);
    expect(app.applyRateLimit).toHaveBeenNthCalledWith(2, request, reply);
    expect(app.applyRateLimit).toHaveBeenNthCalledWith(3, request, reply);
    expect(app.applyRateLimit).toHaveBeenNthCalledWith(4, request, reply);
  });

  it("handles Google OAuth requests", async () => {
    const { app, routes } = createApp();
    mocks.authenticateGoogleUserMock.mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      user: { id: "user_1" }
    });

    await authRoutes(app);

    const route = routes.get("POST /api/auth/oauth/google");
    const reply = createReply();

    await route?.handler({ body: { idToken: "g".repeat(120) } }, reply);

    expect(mocks.authenticateGoogleUserMock).toHaveBeenCalledWith(app, {
      idToken: "g".repeat(120)
    });
    expect(mocks.setRefreshCookieMock).toHaveBeenCalledWith(reply, "refresh-token");
    expect(reply.body).toEqual({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      user: { id: "user_1" }
    });
  });

  it("requires a refresh token for session refresh", async () => {
    const { app, routes } = createApp();

    await authRoutes(app);

    const route = routes.get("POST /api/auth/refresh");
    const reply = createReply();

    await route?.handler({ body: {}, cookies: {} }, reply);

    expect(mocks.refreshSessionMock).not.toHaveBeenCalled();
    expect(reply.statusCode).toBe(401);
    expect(reply.body).toEqual({ message: "Refresh token required" });
  });

  it("refreshes sessions using the body token or cookie token", async () => {
    const { app, routes } = createApp();
    mocks.refreshSessionMock.mockResolvedValue({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      user: { id: "user_1" }
    });

    await authRoutes(app);

    const route = routes.get("POST /api/auth/refresh");
    const reply = createReply();

    await route?.handler(
      {
        body: { refreshToken: "body-token" },
        cookies: { blindspot_refresh: "cookie-token" }
      },
      reply
    );

    expect(mocks.refreshSessionMock).toHaveBeenCalledWith(app, "body-token");
    expect(mocks.setRefreshCookieMock).toHaveBeenCalledWith(reply, "new-refresh-token");
    expect(reply.body).toEqual({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      user: { id: "user_1" }
    });
  });

  it("logs users out and clears the refresh cookie", async () => {
    const { app, routes } = createApp();

    await authRoutes(app);

    const route = routes.get("POST /api/auth/logout");
    const reply = createReply();

    await route?.handler(
      {
        cookies: { blindspot_refresh: "cookie-token" }
      },
      reply
    );

    expect(mocks.revokeRefreshTokenMock).toHaveBeenCalledWith(app, "cookie-token");
    expect(mocks.clearRefreshCookieMock).toHaveBeenCalledWith(reply);
    expect(reply.body).toEqual({ success: true });
  });

  it("returns the authenticated user's profile", async () => {
    const { app, routes } = createApp();
    mocks.buildUserProfileMock.mockResolvedValue({
      id: "user_1",
      email: "founder@example.com",
      plan: "FREE"
    });

    await authRoutes(app);

    const route = routes.get("GET /api/auth/me");
    const result = await route?.handler({
      user: { id: "user_1" }
    });

    expect(mocks.buildUserProfileMock).toHaveBeenCalledWith(app.prisma, "user_1");
    expect(result).toEqual({
      id: "user_1",
      email: "founder@example.com",
      plan: "FREE"
    });
  });

  it("runs the authenticated profile rate-limit prehandler", async () => {
    const { app, routes } = createApp();
    const request = { user: { id: "user_1" } };
    const reply = createReply();

    await authRoutes(app);

    const route = routes.get("GET /api/auth/me");
    const preHandlers = route?.options.preHandler as Array<(request: unknown, reply: unknown) => Promise<void>>;

    await preHandlers[1]?.(request, reply);

    expect(app.applyRateLimit).toHaveBeenCalledWith(request, reply);
  });
});
