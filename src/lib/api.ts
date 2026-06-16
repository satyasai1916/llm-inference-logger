import type {
  Conversation,
  ConversationListResponse,
  Message,
  MetricsSummary,
  LatencyPoint,
  ProviderStat,
  TokenPoint,
} from "@/types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  providers: {
    list: () => request<Record<string, { label: string; models: string[] }>>("/api/v1/providers"),
  },
  conversations: {
    list: (page = 1, pageSize = 20) =>
      request<ConversationListResponse>(`/api/v1/conversations?page=${page}&page_size=${pageSize}`),
    create: (payload: { provider: string; model: string; title?: string }) =>
      request<Conversation>("/api/v1/conversations", { method: "POST", body: JSON.stringify(payload) }),
    get: (id: string) => request<Conversation>(`/api/v1/conversations/${id}`),
    update: (id: string, payload: { title?: string; status?: string }) =>
      request<Conversation>(`/api/v1/conversations/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    delete: (id: string) => fetch(`/api/v1/conversations/${id}`, { method: "DELETE" }),
    messages: (id: string) => request<Message[]>(`/api/v1/conversations/${id}/messages`),
    exportUrl: (id: string, format: "json" | "txt") => `/api/v1/conversations/${id}/export?format=${format}`,
  },
  metrics: {
    summary: (window = "24h") => request<MetricsSummary>(`/api/v1/metrics/summary?window=${window}`),
    latencyOverTime: (window = "24h") => request<LatencyPoint[]>(`/api/v1/metrics/latency-over-time?window=${window}`),
    providerBreakdown: () => request<ProviderStat[]>("/api/v1/metrics/provider-breakdown"),
    tokensOverTime: (window = "24h") => request<TokenPoint[]>(`/api/v1/metrics/tokens-over-time?window=${window}`),
  },
};
