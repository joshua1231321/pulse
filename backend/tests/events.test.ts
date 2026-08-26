import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";

// Isolated on-disk test DB so runs don't collide with dev data, and so we can
// delete it cleanly afterwards.
process.env.DB_PATH = "./data/test.db";
process.env.API_KEY = "test-api-key";
process.env.JWT_SECRET = "test-jwt-secret";

import app from "../src/index";

let deviceToken: string;
let adminToken: string;

beforeAll(async () => {
  const deviceRes = await request(app)
    .post("/auth/token")
    .send({ apiKey: "test-api-key", deviceId: "device-123", role: "device" });
  deviceToken = deviceRes.body.token;

  const adminRes = await request(app)
    .post("/auth/token")
    .send({ apiKey: "test-api-key", deviceId: "dashboard", role: "admin" });
  adminToken = adminRes.body.token;
});

afterAll(() => {
  if (fs.existsSync("./data/test.db")) fs.unlinkSync("./data/test.db");
  if (fs.existsSync("./data/test.db-wal")) fs.unlinkSync("./data/test.db-wal");
  if (fs.existsSync("./data/test.db-shm")) fs.unlinkSync("./data/test.db-shm");
});

describe("auth", () => {
  it("rejects a bad API key", async () => {
    const res = await request(app)
      .post("/auth/token")
      .send({ apiKey: "wrong", deviceId: "d1", role: "device" });
    expect(res.status).toBe(401);
  });

  it("rejects unauthenticated event ingestion", async () => {
    const res = await request(app).post("/api/events").send({});
    expect(res.status).toBe(401);
  });
});

describe("event ingestion + retrieval", () => {
  it("accepts a valid button press from a device token", async () => {
    const res = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${deviceToken}`)
      .send({
        buttonValue: 7,
        clientTimestamp: new Date().toISOString(),
        sessionId: "session-abc",
        platform: "android",
        appVersion: "1.0.0",
      });
    expect(res.status).toBe(201);
    expect(res.body.buttonValue).toBe(7);
    expect(res.body.deviceId).toBe("device-123");
  });

  it("rejects an out-of-range button value", async () => {
    const res = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${deviceToken}`)
      .send({
        buttonValue: 42,
        clientTimestamp: new Date().toISOString(),
        sessionId: "session-abc",
      });
    expect(res.status).toBe(400);
  });

  it("blocks devices from reading the aggregate event list", async () => {
    const res = await request(app)
      .get("/api/events")
      .set("Authorization", `Bearer ${deviceToken}`);
    expect(res.status).toBe(403);
  });

  it("lets an admin token retrieve paginated events", async () => {
    const res = await request(app)
      .get("/api/events?page=1&pageSize=10")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.total).toBeGreaterThan(0);
  });

  it("filters events by buttonValue", async () => {
    const res = await request(app)
      .get("/api/events?buttonValue=7")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    for (const row of res.body.data) {
      expect(row.buttonValue).toBe(7);
    }
  });
});

describe("metrics", () => {
  it("returns aggregate counts to an admin", async () => {
    const res = await request(app)
      .get("/api/metrics/aggregate")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.totalEvents).toBeGreaterThan(0);
    expect(res.body.countsByButton["7"]).toBeGreaterThan(0);
  });
});
