import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetchAggregateMetrics } from "../api/client";
import type { StatCardConfig, StatCardProps } from "../types";

const STAT_CARDS: StatCardConfig[] = [
  { label: "Total events", key: "totalEvents" },
  { label: "Unique devices", key: "uniqueDevices" },
  { label: "Last minute", key: "eventsLastMinute" },
  { label: "Last hour", key: "eventsLastHour" },
];

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="card stat-card">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
    </div>
  );
}

export function MetricsPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["metrics"],
    queryFn: fetchAggregateMetrics,
    // Aggregate is cheap; refetch on an interval as a fallback in case the
    // WebSocket connection is down, in addition to the push-driven invalidation.
    refetchInterval: 15000,
  });

  const chartData = Array.from({ length: 10 }, (_, digit) => ({
    digit: String(digit),
    count: data?.countsByButton?.[digit] ?? 0,
  }));

  return (
    <>
      <div className="stat-grid">
        {STAT_CARDS.map(({ label, key }) => (
          <StatCard key={key} label={label} value={data?.[key] ?? "—"} />
        ))}
      </div>

      <div className="card panel">
        <div className="panel-header">
          <h2 className="panel-title">Presses by digit</h2>
        </div>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="digit"
                tick={{ fill: "var(--text-muted)", fontFamily: "IBM Plex Mono", fontSize: 12 }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--text-faint)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip
                cursor={{ fill: "rgba(var(--amber-rgb), 0.08)" }}
                contentStyle={{
                  background: "var(--panel-raised)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                labelStyle={{ color: "var(--text)" }}
              />
              <Bar dataKey="count" fill="var(--amber)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
