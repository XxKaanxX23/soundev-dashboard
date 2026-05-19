import { afterEach, describe, expect, it } from "vitest";
import { POST } from "./route";

const originalEnv = {
  GA4_PROPERTY_ID: process.env.GA4_PROPERTY_ID,
  GOOGLE_APPLICATION_CREDENTIALS_JSON: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
};

describe("GA4 event audit route", () => {
  afterEach(() => {
    process.env.GA4_PROPERTY_ID = originalEnv.GA4_PROPERTY_ID;
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON =
      originalEnv.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  });

  it("returns safe setup status when GA4 env vars are missing", async () => {
    process.env.GA4_PROPERTY_ID = "";
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = "";

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      ok: false,
      propertyIdPresent: false,
      credentialsPresent: false,
      measurementIdKnown: "G-0D4LN9DL38",
    });
    expect(JSON.stringify(body)).not.toContain("GOOGLE_APPLICATION_CREDENTIALS_JSON");
  });
});
