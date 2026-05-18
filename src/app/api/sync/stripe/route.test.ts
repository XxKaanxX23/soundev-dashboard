import { afterEach, describe, expect, it } from "vitest";
import { POST } from "./route";

const originalEnv = {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

describe("Stripe historical sync route", () => {
  afterEach(() => {
    process.env.STRIPE_SECRET_KEY = originalEnv.STRIPE_SECRET_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalEnv.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("returns a safe JSON error when sync credentials are missing", async () => {
    process.env.STRIPE_SECRET_KEY = "";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "";

    const response = await POST(
      new Request("http://localhost/api/sync/stripe", {
        method: "POST",
        body: JSON.stringify({ days: 30 }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      ok: false,
      errors: ["Set STRIPE_SECRET_KEY and SUPABASE_SERVICE_ROLE_KEY."],
    });
  });
});
