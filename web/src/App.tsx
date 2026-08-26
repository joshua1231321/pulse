import { useState } from "react";
import { clearToken, getStoredToken } from "./api/client";
import { LoginGate } from "./components/LoginGate";
import { MetricsPanel } from "./components/MetricsPanel";
import { EventsTable } from "./components/EventsTable";
import { PulseStrip } from "./components/PulseStrip";
import { useEventsStream } from "./hooks/useEventsStream";

export default function App() {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const { connected, recentEvents } = useEventsStream(token);

  if (!token) {
    return (
      <div className="app-shell">
        <LoginGate onAuthenticated={setToken} />
      </div>
    );
  }

  function handleSignOut() {
    clearToken();
    setToken(null);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-row">
          <div className="brand">
            <span className="brand-mark">◆</span> PulseSync
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span className={`live-dot ${connected ? "" : "offline"}`}>
              {connected ? "Live" : "Reconnecting…"}
            </span>
            <button className="btn btn-ghost" style={{ width: "auto", padding: "6px 12px" }} onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </div>
        <PulseStrip recentEvents={recentEvents} />
      </header>

      <main className="main">
        <div className="main-inner">
          <MetricsPanel />
          <EventsTable />
        </div>
      </main>

      <footer className="footer-note">
        PulseSync admin console — telemetry from the mobile action-log client.
      </footer>
    </div>
  );
}
