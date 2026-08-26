import { Router, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { AuthedRequest, requireAuth, requireRole } from "../auth";
import { insertEvent, queryEvents } from "../db";
import { ActionEvent } from "../types";
import { broadcast } from "../ws";

const router = Router();

const createEventSchema = z.object({
  buttonValue: z.number().int().min(0).max(9),
  clientTimestamp: z.string().datetime(),
  sessionId: z.string().min(1),
  platform: z.string().min(1).default("android"),
  appVersion: z.string().min(1).default("unknown"),
});

/**
 * POST /api/events
 * Ingests a single button-press event from an authenticated device.
 * Any authenticated role may ingest (a device token is the common case,
 * but an admin token is also accepted to simplify manual/testing use).
 */
router.post("/", requireAuth, (req: AuthedRequest, res: Response) => {
  const parsed = createEventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid event payload", details: parsed.error.flatten() });
  }

  const event: ActionEvent = {
    id: uuidv4(),
    deviceId: req.auth!.deviceId,
    sessionId: parsed.data.sessionId,
    buttonValue: parsed.data.buttonValue,
    serverTimestamp: new Date().toISOString(),
    clientTimestamp: parsed.data.clientTimestamp,
    platform: parsed.data.platform,
    appVersion: parsed.data.appVersion,
  };

  insertEvent(event);
  broadcast({ type: "event.created", payload: event });

  res.status(201).json(event);
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  buttonValue: z.coerce.number().int().min(0).max(9).optional(),
  deviceId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

/**
 * GET /api/events
 * Paginated, searchable, sortable retrieval — admin (dashboard) only.
 */
router.get("/", requireAuth, requireRole("admin"), (req: AuthedRequest, res: Response) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query", details: parsed.error.flatten() });
  }

  const { rows, total } = queryEvents(parsed.data);
  res.json({ data: rows, total, page: parsed.data.page, pageSize: parsed.data.pageSize });
});

export default router;
