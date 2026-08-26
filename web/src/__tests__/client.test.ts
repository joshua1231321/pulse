import { describe, expect, it, vi, beforeEach } from "vitest";
import { fetchAdminToken, getStoredToken, storeToken, clearToken } from "../api/client";

describe("token storage", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips a stored token", () => {
    expect(getStoredToken()).toBeNull();
    storeToken("abc.def.ghi");
    expect(getStoredToken()).toBe("abc.def.ghi");
    clearToken();
    expect(getStoredToken()).toBeNull();
  });
});

describe("fetchAdminToken", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse((init?.body as string) || "{}");
        if (body.apiKey === "correct-key") {
          return new Response(JSON.stringify({ token: "signed-jwt" }), { status: 200 });
        }
        return new Response(JSON.stringify({ error: "Invalid API key" }), { status: 401 });
      })
    );
  });

  it("resolves a token for a valid API key", async () => {
    const token = await fetchAdminToken("correct-key");
    expect(token).toBe("signed-jwt");
  });

  it("throws with the server's error message for a bad key", async () => {
    await expect(fetchAdminToken("wrong-key")).rejects.toThrow("Invalid API key");
  });
});
