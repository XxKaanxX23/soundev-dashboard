import { afterEach, describe, expect, it } from "vitest";
import { GET } from "./route";

const originalEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

describe("Stripe health route", () => {
  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
      originalEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.STRIPE_SECRET_KEY = originalEnv.STRIPE_SECRET_KEY;
    process.env.STRIPE_WEBHOOK_SECRET = originalEnv.STRIPE_WEBHOOK_SECRET;
    process.env.SUPABASE_SERVICE_ROLE_KEY =
      originalEnv.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("returns setup booleans and never exposes secret values", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
    process.env.STRIPE_SECRET_KEY = "sk_test_do_not_expose";
    process.env.STRIPE_WEBHOOK_SECRET = "";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "";

    const response = await GET();
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      env: {
        supabaseEnvDetected: false,
        stripeSecretKeyDetected: true,
        stripeWebhookSecretDetected: false,
        supabaseServiceRoleDetected: false,
      },
      clients: {
        stripeClientAvailable: true,
        supabaseAdminClientAvailable: false,
      },
    });
    expect(body.timestamp).toEqual(expect.any(String));
    expect(serialized).not.toContain("sk_test_do_not_expose");
  });
});
