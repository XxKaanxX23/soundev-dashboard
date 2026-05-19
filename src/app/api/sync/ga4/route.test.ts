import { afterEach, describe, expect, it } from "vitest";
import { POST } from "./route";

const originalEnv = {
  GA4_PROPERTY_ID: process.env.GA4_PROPERTY_ID,
  GOOGLE_APPLICATION_CREDENTIALS_JSON: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
};

describe("GA4 sync route", () => {
  afterEach(() => {
    process.env.GA4_PROPERTY_ID = originalEnv.GA4_PROPERTY_ID;
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON =
      originalEnv.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  });

  it("returns a safe JSON error when GA4 env vars are missing", async () => {
    process.env.GA4_PROPERTY_ID = "";
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = "";

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      ok: false,
      errors: ["Add the numeric GA4 property ID.", "Add Google service account credentials JSON."],
    });
    expect(JSON.stringify(body)).not.toContain("GOOGLE_APPLICATION_CREDENTIALS_JSON");
  });
});
