import { Router, Response } from "express";
import { AuthedRequest, requireAuth, requireRole } from "../auth";
import { getAggregateMetrics } from "../db";

const router = Router();

/**
 * GET /api/metrics/aggregate
 * Cheap, precomputed rollups for the dashboard's summary cards + bar chart.
 * Kept as a separate endpoint from /api/events so the web client can poll or
 * refresh this lightweight summary far more often than it re-fetches the
 * full (paginated) event table.
 */
router.get("/aggregate", requireAuth, requireRole("admin"), (_req: AuthedRequest, res: Response) => {
  res.json(getAggregateMetrics());
});

export default router;
