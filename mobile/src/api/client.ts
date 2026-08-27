import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import type { SendResult } from "../types";

const API_URL: string = Constants.expoConfig?.extra?.apiUrl || "http://10.0.2.2:4000";
const API_KEY: string = Constants.expoConfig?.extra?.apiKey || "";

const DEVICE_ID_KEY = "pulsesync_device_id";
const TOKEN_KEY = "pulsesync_device_token";

/** Lazily creates and persists a stable per-install device identifier. */
async function getOrCreateDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const id = `device-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

// One sessionId per app process — lets the dashboard distinguish presses
// from the same device across separate app opens without needing user auth.
const sessionId = `session-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;

async function getToken(deviceId: string): Promise<string> {
  const cached = await AsyncStorage.getItem(TOKEN_KEY);
  if (cached) return cached;

  const res = await fetch(`${API_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: API_KEY, deviceId, role: "device" }),
  });
  if (!res.ok) throw new Error(`Failed to authenticate: ${res.status}`);
  const data = await res.json();
  await AsyncStorage.setItem(TOKEN_KEY, data.token);
  return data.token as string;
}

/**
 * Sends a single button press. Retries once after clearing a cached token,
 * in case the token expired between app opens (12h TTL server-side).
 */
export async function sendButtonEvent(buttonValue: number): Promise<SendResult> {
  try {
    const deviceId = await getOrCreateDeviceId();
    let token = await getToken(deviceId);

    const body = JSON.stringify({
      buttonValue,
      clientTimestamp: new Date().toISOString(),
      sessionId,
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version || "1.0.0",
    });

    let res = await fetch(`${API_URL}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body,
    });

    if (res.status === 401) {
      await AsyncStorage.removeItem(TOKEN_KEY);
      token = await getToken(deviceId);
      res = await fetch(`${API_URL}/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body,
      });
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      console.error("PulseSync send failed", res.status, err);   // ADD THIS
      return { ok: false, error: err.error || "Request failed" };
    }
    return { ok: true };
  } catch (e) {
    console.error("PulseSync network error", e);   // ADD THIS
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
  
}
