import { z } from "zod";

import { PaginatedAnalysesSchema, UserProfileSchema } from "@blindspot/shared";

export const userProfileResponseSchema = UserProfileSchema;
export const userHistoryResponseSchema = PaginatedAnalysesSchema;
export const updateUserBodySchema = z.object({
  name: z.string().trim().min(2).max(80)
});

