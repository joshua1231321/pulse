import { IncomingMessage } from "node:http";
import { Duplex } from "node:stream";
import jwt from "jsonwebtoken";
import { WebSocket, WebSocketServer } from "ws";
import { AuthTokenPayload } from "./types";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-do-not-use-in-prod";

const wss = new WebSocketServer({ noServer: true });
const adminSockets = new Set<WebSocket>();

/**
 * Upgrades HTTP -> WS only for authenticated admins, so the live feed can't
 * be used to bypass the same auth boundary as the REST API. Token is passed
 * as a query param (?token=...) since browsers can't set custom headers on
 * the WebSocket handshake.
 */
export function handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer) {
  const url = new URL(req.url || "", "http://localhost");
  if (url.pathname !== "/ws") {
    socket.destroy();
    return;
  }

  const token = url.searchParams.get("token") || "";
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    if (decoded.role !== "admin") throw new Error("not admin");
  } catch {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    adminSockets.add(ws);
    ws.on("close", () => adminSockets.delete(ws));
  });
}

/** Pushes a JSON message to every connected admin dashboard in real time. */
export function broadcast(message: unknown) {
  const payload = JSON.stringify(message);
  for (const ws of adminSockets) {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  }
}
