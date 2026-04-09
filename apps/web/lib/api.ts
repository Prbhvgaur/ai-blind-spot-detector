import type { PaginatedAnalyses, PublicAnalysis, UserProfile } from "@blindspot/shared";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3101";

type RequestOptions = {
  accessToken?: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: "include",
    cache: "no-store"
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(payload.message ?? "Request failed");
  }

  return response.json();
}

export const api = {
  me: (accessToken: string) => request<UserProfile>("/api/users/me", { accessToken }),
  createAnalysis: (accessToken: string, input: string) =>
    request<{ analysisId: string; status: 202 }>("/api/analyses", {
      method: "POST",
      accessToken,
      body: { input }
    }),
  getAnalysis: (analysisId: string, accessToken?: string, shareToken?: string) =>
    request<PublicAnalysis>(
      `/api/analyses/${analysisId}${shareToken ? `?shareToken=${shareToken}` : ""}`,
      { accessToken }
    ),
  listAnalyses: (accessToken: string, page = 1, limit = 10) =>
    request<PaginatedAnalyses>(`/api/analyses?page=${page}&limit=${limit}`, { accessToken }),
  toggleShare: (accessToken: string, analysisId: string, isPublic?: boolean) =>
    request<PublicAnalysis>(`/api/analyses/${analysisId}/share`, {
      method: "PATCH",
      accessToken,
      body: { isPublic }
    }),
  deleteAnalysis: (accessToken: string, analysisId: string) =>
    request<PublicAnalysis>(`/api/analyses/${analysisId}`, {
      method: "DELETE",
      accessToken
    }),
  createCheckoutSession: (accessToken: string) =>
    request<{ url: string }>("/api/billing/checkout-session", {
      method: "POST",
      accessToken
    }),
  createPortalSession: (accessToken: string) =>
    request<{ url: string }>("/api/billing/portal-session", {
      method: "POST",
      accessToken
    })
};
