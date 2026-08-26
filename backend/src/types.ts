export type Role = "device" | "admin";

export interface AuthTokenPayload {
  deviceId: string;
  role: Role;
}

export interface ActionEvent {
  id: string;
  deviceId: string;
  sessionId: string;
  buttonValue: number;
  serverTimestamp: string; // ISO 8601, set by server (authoritative ordering)
  clientTimestamp: string; // ISO 8601, set by device (for latency/skew analysis)
  platform: string; // "android" | "ios" | "web" | etc.
  appVersion: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AggregateMetrics {
  totalEvents: number;
  uniqueDevices: number;
  eventsLastHour: number;
  eventsLastMinute: number;
  countsByButton: Record<string, number>;
}

export interface QueryOptions {
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  buttonValue?: number;
  deviceId?: string;
  from?: string;
  to?: string;
}