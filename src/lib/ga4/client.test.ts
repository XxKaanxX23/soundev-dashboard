import { describe, expect, it } from "vitest";
import {
  GA4_MEASUREMENT_ID,
  getGa4Config,
  getGa4EnvStatus,
  parseGoogleCredentialsJson,
} from "./client";

describe("GA4 client config", () => {
  it("reports missing env without exposing credential values", () => {
    const status = getGa4EnvStatus({
      GA4_PROPERTY_ID: "",
      GOOGLE_APPLICATION_CREDENTIALS_JSON: "",
    });

    expect(status).toEqual({
      ga4EnvDetected: false,
      ga4PropertyIdDetected: false,
      googleCredentialsDetected: false,
      measurementIdKnown: GA4_MEASUREMENT_ID,
    });
  });

  it("parses service account JSON and normalizes escaped private key newlines", () => {
    const credentials = parseGoogleCredentialsJson(
      JSON.stringify({
        client_email: "ga4-service@example.iam.gserviceaccount.com",
        private_key: "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n",
      }),
    );

    expect(credentials.client_email).toBe(
      "ga4-service@example.iam.gserviceaccount.com",
    );
    expect(credentials.private_key).toContain("\nabc\n");
    expect(credentials.private_key).not.toContain("\\n");
  });

  it("returns safe config errors without echoing secret env values", () => {
    const config = getGa4Config({
      GA4_PROPERTY_ID: "",
      GOOGLE_APPLICATION_CREDENTIALS_JSON:
        '{"client_email":"secret@example.com","private_key":"secret"}',
    });

    expect(config.ok).toBe(false);
    expect(config.errors).toContain("Add the numeric GA4 property ID.");
    expect(JSON.stringify(config)).not.toContain("secret@example.com");
  });
});
