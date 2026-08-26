import { Router } from "express";
import { z } from "zod";
import { signToken } from "../auth";

const router = Router();

const tokenRequestSchema = z.object({
  apiKey: z.string().min(1),
  deviceId: z.string().min(1),
  role: z.enum(["device", "admin"]),
});

/**
 * POST /auth/token
 * Exchanges the shared API_KEY for a short-lived, role-scoped JWT.
 * The mobile app requests a "device" token; the web dashboard requests "admin".
 * This keeps the long-lived secret off the wire on every request and lets us
 * revoke/rotate access by simply rotating API_KEY without touching clients'
 * stored long-term credentials.
 */
router.post("/token", (req, res) => {
  const parsed = tokenRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  const { apiKey, deviceId, role } = parsed.data;
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: "Invalid API key" });
  }

  const token = signToken({ deviceId, role });
  res.json({ token, expiresIn: process.env.JWT_EXPIRES_IN || "12h" });
});

export default router;
