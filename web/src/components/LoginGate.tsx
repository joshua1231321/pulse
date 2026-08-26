import { FormEvent, useState } from "react";
import { fetchAdminToken, storeToken } from "../api/client";
import type { LoginGateProps } from "../types";

/**
 * The dashboard has no user accounts by design (this is a single-tenant
 * internal admin tool) — the operator pastes the shared API key once, we
 * exchange it for a short-lived admin JWT, and only the JWT is kept/used
 * afterwards. Re-entering the key is only needed after the token expires.
 */
export function LoginGate({ onAuthenticated }: LoginGateProps) {
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const token = await fetchAdminToken(apiKey);
      storeToken(token);
      onAuthenticated(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={handleSubmit}>
        <h1 className="login-title">PulseSync</h1>
        <p className="login-sub">Enter the admin API key to open the telemetry console.</p>

        <div className="field">
          <label className="field-label" htmlFor="apiKey">API key</label>
          <input
            id="apiKey"
            className="input"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            autoFocus
            required
          />
        </div>

        <button className="btn" type="submit" disabled={loading || !apiKey}>
          {loading ? "Verifying…" : "Open console"}
        </button>
      </form>

      {error && (
        <div className="toast toast-error" role="alert" aria-live="assertive">
          <span className="toast-mark" aria-hidden="true">!</span>
          <div>
            <strong>Access denied</strong>
            <p>That API key did not unlock the console. Check it and try again.</p>
          </div>
          <button className="toast-dismiss" type="button" onClick={() => setError(null)} aria-label="Dismiss notification">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
