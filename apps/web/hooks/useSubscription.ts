"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export const useSubscription = (accessToken?: string) =>
  useQuery({
    queryKey: ["me", accessToken],
    queryFn: () => api.me(accessToken!),
    enabled: Boolean(accessToken)
  });

