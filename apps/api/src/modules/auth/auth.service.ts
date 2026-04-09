import crypto from "node:crypto";

import argon2 from "argon2";

import { REFRESH_COOKIE_NAME, REFRESH_TOKEN_TTL_DAYS } from "../../config/constants";
import { verifyGoogleIdToken } from "../../lib/google";
import { hashOpaqueToken } from "../../plugins/auth";
import { buildUserProfile } from "../users/users.service";

const refreshTokenExpiry = () => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);
  return expiresAt;
};

export const hashPassword = (password: string) =>
  argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1
  });

export const verifyPassword = (hash: string, password: string) =>
  argon2.verify(hash, password);

const issueRefreshToken = async (prisma: any, userId: string) => {
  const rawToken = crypto.randomBytes(48).toString("hex");
  const hashedToken = hashOpaqueToken(rawToken);

  await prisma.refreshToken.create({
    data: {
      token: hashedToken,
      userId,
      expiresAt: refreshTokenExpiry()
    }
  });

  return rawToken;
};

const buildAuthPayload = async (fastify: any, userId: string, email: string, plan: "FREE" | "PRO") => {
  const refreshToken = await issueRefreshToken(fastify.prisma, userId);
  const accessToken = fastify.jwt.sign({
    id: userId,
    email,
    plan
  });
  const user = await buildUserProfile(fastify.prisma, userId);

  return {
    accessToken,
    refreshToken,
    user
  };
};

export const setRefreshCookie = (reply: any, refreshToken: string) => {
  reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60
  });
};

export const clearRefreshCookie = (reply: any) => {
  reply.clearCookie(REFRESH_COOKIE_NAME, {
    path: "/"
  });
};

export const registerUser = async (fastify: any, input: { email: string; password: string; name?: string }) => {
  const existing = await fastify.prisma.user.findUnique({
    where: { email: input.email.toLowerCase() }
  });

  if (existing) {
    throw fastify.httpErrors.conflict("An account with that email already exists");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await fastify.prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash,
      name: input.name ?? null
    }
  });

  return buildAuthPayload(fastify, user.id, user.email, user.plan);
};

export const loginUser = async (fastify: any, input: { email: string; password: string }) => {
  const user = await fastify.prisma.user.findUnique({
    where: { email: input.email.toLowerCase() }
  });

  if (!user) {
    throw fastify.httpErrors.unauthorized("Invalid email or password");
  }

  if (!user.passwordHash) {
    throw fastify.httpErrors.unauthorized(
      "This account uses Google sign-in. Continue with Google to access it."
    );
  }

  if (!(await verifyPassword(user.passwordHash, input.password))) {
    throw fastify.httpErrors.unauthorized("Invalid email or password");
  }

  return buildAuthPayload(fastify, user.id, user.email, user.plan);
};

export const authenticateGoogleUser = async (fastify: any, input: { idToken: string }) => {
  const identity = await verifyGoogleIdToken(input.idToken);

  if (!identity.emailVerified) {
    throw fastify.httpErrors.unauthorized("Google account email is not verified");
  }

  const normalizedEmail = identity.email.toLowerCase();
  let user = await fastify.prisma.user.findUnique({
    where: { googleId: identity.sub }
  });

  if (!user) {
    const existingByEmail = await fastify.prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingByEmail) {
      if (existingByEmail.googleId && existingByEmail.googleId !== identity.sub) {
        throw fastify.httpErrors.conflict(
          "That email is already linked to a different Google account"
        );
      }

      user = await fastify.prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          googleId: identity.sub,
          name: existingByEmail.name ?? identity.name ?? null
        }
      });
    } else {
      user = await fastify.prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash: null,
          googleId: identity.sub,
          name: identity.name ?? null
        }
      });
    }
  }

  return buildAuthPayload(fastify, user.id, user.email, user.plan);
};

export const refreshSession = async (fastify: any, token: string) => {
  const hashedToken = hashOpaqueToken(token);
  const stored = await fastify.prisma.refreshToken.findUnique({
    where: { token: hashedToken },
    include: { user: true }
  });

  if (!stored || stored.expiresAt < new Date()) {
    throw fastify.httpErrors.unauthorized("Invalid refresh token");
  }

  await fastify.prisma.refreshToken.delete({
    where: { token: hashedToken }
  });

  return buildAuthPayload(fastify, stored.user.id, stored.user.email, stored.user.plan);
};

export const revokeRefreshToken = async (fastify: any, token?: string) => {
  if (!token) {
    return;
  }

  const hashedToken = hashOpaqueToken(token);
  await fastify.prisma.refreshToken.deleteMany({
    where: { token: hashedToken }
  });
};
