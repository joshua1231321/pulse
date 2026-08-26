import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { wsUrl } from "../api/client";
import type { ActionEvent } from "../types";

/**
 * Subscribes to the backend's WebSocket feed of newly-created events.
 * Keeps a small in-memory ring buffer (for the pulse-strip visualization)
 * and invalidates the paginated/aggregate React Query caches so the table
 * and stat cards refresh without polling.
 */
export function useEventsStream(token: string | null) {
  const [connected, setConnected] = useState(false);
  const [recentEvents, setRecentEvents] = useState<ActionEvent[]>([]);
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout>;

    function connect() {
      const ws = new WebSocket(wsUrl(token!));
      wsRef.current = ws;

      ws.onopen = () => !cancelled && setConnected(true);
      ws.onclose = () => {
        if (cancelled) return;
        setConnected(false);
        // Simple backoff reconnect — keeps the dashboard live across brief network blips.
        retryTimer = setTimeout(connect, 2000);
      };
      ws.onerror = () => ws.close();

      ws.onmessage = (msg) => {
        try {
          const parsed = JSON.parse(msg.data);
          if (parsed.type === "event.created") {
            const event = parsed.payload as ActionEvent;
            setRecentEvents((prev) => [...prev.slice(-99), event]);
            queryClient.invalidateQueries({ queryKey: ["events"] });
            queryClient.invalidateQueries({ queryKey: ["metrics"] });
          }
        } catch {
          // ignore malformed frames
        }
      };
    }

    connect();
    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      wsRef.current?.close();
    };
  }, [token, queryClient]);

  return { connected, recentEvents };
}
