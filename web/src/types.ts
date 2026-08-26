export interface ActionEvent {
  id: string;
  deviceId: string;
  sessionId: string;
  buttonValue: number;
  serverTimestamp: string;
  clientTimestamp: string;
  platform: string;
  appVersion: string;
}

export interface PaginatedEvents {
  data: ActionEvent[];
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

export interface EventsQuery {
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  buttonValue?: number;
}

export interface LoginGateProps {
  onAuthenticated: (token: string) => void;
}

export interface PulseStripProps {
  recentEvents: ActionEvent[];
}

export interface StatCardProps {
  label: string;
  value: string | number;
}

export type StatMetricKey =
  | "totalEvents"
  | "uniqueDevices"
  | "eventsLastMinute"
  | "eventsLastHour";

export interface StatCardConfig {
  label: string;
  key: StatMetricKey;
}
