import { afterEach, describe, expect, it } from "vitest";
import { POST } from "./route";

const originalEnv = {
  META_ACCESS_TOKEN: process.env.META_ACCESS_TOKEN,
  META_AD_ACCOUNT_ID: process.env.META_AD_ACCOUNT_ID,
};

describe("Meta sync route", () => {
  afterEach(() => {
    process.env.META_ACCESS_TOKEN = originalEnv.META_ACCESS_TOKEN;
    process.env.META_AD_ACCOUNT_ID = originalEnv.META_AD_ACCOUNT_ID;
  });

  it("returns a safe JSON error when Meta env vars are missing", async () => {
    process.env.META_ACCESS_TOKEN = "";
    process.env.META_AD_ACCOUNT_ID = "";

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      ok: false,
      errors: ["Set META_ACCESS_TOKEN and META_AD_ACCOUNT_ID."],
    });
    expect(JSON.stringify(body)).not.toContain("META_ACCESS_TOKEN=");
  });
});
