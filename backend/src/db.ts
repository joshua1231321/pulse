import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { ActionEvent, QueryOptions } from "./types";

const DB_PATH = process.env.DB_PATH || "./data/pulsesync.db";

// Ensure the containing directory exists (fresh container volumes, first run, etc.)
const dir = path.dirname(DB_PATH);
if (dir && dir !== "." && !fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS action_events (
    id TEXT PRIMARY KEY,
    deviceId TEXT NOT NULL,
    sessionId TEXT NOT NULL,
    buttonValue INTEGER NOT NULL CHECK (buttonValue BETWEEN 0 AND 9),
    serverTimestamp TEXT NOT NULL,
    clientTimestamp TEXT NOT NULL,
    platform TEXT NOT NULL,
    appVersion TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_events_serverTimestamp ON action_events (serverTimestamp);
  CREATE INDEX IF NOT EXISTS idx_events_deviceId ON action_events (deviceId);
  CREATE INDEX IF NOT EXISTS idx_events_buttonValue ON action_events (buttonValue);
`);

const insertStmt = db.prepare(`
  INSERT INTO action_events
    (id, deviceId, sessionId, buttonValue, serverTimestamp, clientTimestamp, platform, appVersion)
  VALUES
    (@id, @deviceId, @sessionId, @buttonValue, @serverTimestamp, @clientTimestamp, @platform, @appVersion)
`);

export function insertEvent(event: ActionEvent): void {
  insertStmt.run(event);
}

// Allow-list to prevent SQL injection via dynamic ORDER BY column names.
const SORTABLE_COLUMNS = new Set([
  "serverTimestamp",
  "clientTimestamp",
  "buttonValue",
  "deviceId",
  "platform",
]);

export function queryEvents(opts: QueryOptions): { rows: ActionEvent[]; total: number } {
  const sortBy = SORTABLE_COLUMNS.has(opts.sortBy || "") ? opts.sortBy! : "serverTimestamp";
  const sortDir = opts.sortDir === "asc" ? "ASC" : "DESC";

  const clauses: string[] = [];
  const params: Record<string, unknown> = {};

  if (opts.search) {
    clauses.push("(deviceId LIKE @search OR platform LIKE @search OR sessionId LIKE @search)");
    params.search = `%${opts.search}%`;
  }
  if (opts.buttonValue !== undefined) {
    clauses.push("buttonValue = @buttonValue");
    params.buttonValue = opts.buttonValue;
  }
  if (opts.deviceId) {
    clauses.push("deviceId = @deviceId");
    params.deviceId = opts.deviceId;
  }
  if (opts.from) {
    clauses.push("serverTimestamp >= @from");
    params.from = opts.from;
  }
  if (opts.to) {
    clauses.push("serverTimestamp <= @to");
    params.to = opts.to;
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const total = (db.prepare(`SELECT COUNT(*) as c FROM action_events ${where}`).get(params) as { c: number }).c;

  const offset = (opts.page - 1) * opts.pageSize;
  const rows = db
    .prepare(
      `SELECT * FROM action_events ${where} ORDER BY ${sortBy} ${sortDir} LIMIT @limit OFFSET @offset`
    )
    .all({ ...params, limit: opts.pageSize, offset }) as ActionEvent[];

  return { rows, total };
}

export function getAggregateMetrics() {
  const totalEvents = (db.prepare("SELECT COUNT(*) as c FROM action_events").get() as { c: number }).c;
  const uniqueDevices = (
    db.prepare("SELECT COUNT(DISTINCT deviceId) as c FROM action_events").get() as { c: number }
  ).c;

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();

  const eventsLastHour = (
    db
      .prepare("SELECT COUNT(*) as c FROM action_events WHERE serverTimestamp >= ?")
      .get(oneHourAgo) as { c: number }
  ).c;
  const eventsLastMinute = (
    db
      .prepare("SELECT COUNT(*) as c FROM action_events WHERE serverTimestamp >= ?")
      .get(oneMinuteAgo) as { c: number }
  ).c;

  const byButtonRows = db
    .prepare("SELECT buttonValue, COUNT(*) as c FROM action_events GROUP BY buttonValue")
    .all() as { buttonValue: number; c: number }[];

  const countsByButton: Record<string, number> = {};
  for (let i = 0; i <= 9; i++) countsByButton[i] = 0;
  for (const row of byButtonRows) countsByButton[row.buttonValue] = row.c;

  return { totalEvents, uniqueDevices, eventsLastHour, eventsLastMinute, countsByButton };
}
