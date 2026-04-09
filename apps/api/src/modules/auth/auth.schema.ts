import { z } from "zod";

import { UserProfileSchema } from "@blindspot/shared";

export const registerBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(2).max(80).optional()
});

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

export const googleOAuthBodySchema = z.object({
  idToken: z.string().min(100)
});

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(20).optional()
});

export const authResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: UserProfileSchema
});
