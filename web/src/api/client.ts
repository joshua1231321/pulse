const API_URL = import.meta.env.VITE_API_URL || "";
import type { AggregateMetrics, EventsQuery, PaginatedEvents } from "../types";

const TOKEN_STORAGE_KEY = "pulsesync_admin_token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function storeToken(token: string) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function wsUrl(token: string): string {
  const base = API_URL.replace(/^http/, "ws");
  return `${base}/ws?token=${encodeURIComponent(token)}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });

  if (res.status === 401) {
    clearToken();
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchAdminToken(apiKey: string): Promise<string> {
  const res = await fetch(`${API_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, deviceId: "web-dashboard", role: "admin" }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || "Invalid API key");
  }
  const data = await res.json();
  return data.token as string;
}

export function fetchEvents(query: EventsQuery): Promise<PaginatedEvents> {
  const params = new URLSearchParams();
  params.set("page", String(query.page));
  params.set("pageSize", String(query.pageSize));
  if (query.search) params.set("search", query.search);
  if (query.sortBy) params.set("sortBy", query.sortBy);
  if (query.sortDir) params.set("sortDir", query.sortDir);
  if (query.buttonValue !== undefined) params.set("buttonValue", String(query.buttonValue));
  return request<PaginatedEvents>(`/api/events?${params.toString()}`);
}

export function fetchAggregateMetrics(): Promise<AggregateMetrics> {
  return request<AggregateMetrics>("/api/metrics/aggregate");
}
