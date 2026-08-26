import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import http from "node:http";
import authRoutes from "./routes/auth";
import eventsRoutes from "./routes/events";
import metricsRoutes from "./routes/metrics";
import { handleUpgrade } from "./ws";

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || "*",
  })
);
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", uptime: process.uptime() }));

app.use("/auth", authRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/metrics", metricsRoutes);

// Centralized error handler — keeps route handlers free of try/catch boilerplate
// for anything unexpected (a thrown error still yields a clean JSON response).
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const server = http.createServer(app);
server.on("upgrade", handleUpgrade);

server.listen(PORT, () => {
  console.log(`PulseSync backend listening on :${PORT}`);
});

export default app;
