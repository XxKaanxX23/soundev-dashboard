import { afterEach, describe, expect, it } from "vitest";
import { POST } from "./route";

const originalEnv = {
  GHL_API_KEY: process.env.GHL_API_KEY,
  GHL_LOCATION_ID: process.env.GHL_LOCATION_ID,
};

describe("GoHighLevel capability audit route", () => {
  afterEach(() => {
    process.env.GHL_API_KEY = originalEnv.GHL_API_KEY;
    process.env.GHL_LOCATION_ID = originalEnv.GHL_LOCATION_ID;
  });

  it("returns safe setup status when GoHighLevel env vars are missing", async () => {
    process.env.GHL_API_KEY = "";
    process.env.GHL_LOCATION_ID = "";

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      ok: false,
      tokenPresent: false,
      locationIdPresent: false,
    });
    expect(JSON.stringify(body)).not.toContain("GHL_API_KEY=");
  });
});
