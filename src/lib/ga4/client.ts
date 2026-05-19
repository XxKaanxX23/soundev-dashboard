import { BetaAnalyticsDataClient } from "@google-analytics/data";

export const GA4_MEASUREMENT_ID = "G-0D4LN9DL38";

export type Ga4Env = Record<string, string | undefined>;

export type GoogleServiceAccountCredentials = {
  client_email: string;
  private_key: string;
  project_id?: string;
};

export type Ga4Config =
  | {
      ok: true;
      propertyId: string;
      credentials: GoogleServiceAccountCredentials;
      errors: [];
    }
  | {
      ok: false;
      propertyId: null;
      credentials: null;
      errors: string[];
    };

export function getGa4EnvStatus(env: Ga4Env = process.env) {
  return {
    ga4EnvDetected: Boolean(
      env.GA4_PROPERTY_ID && env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
    ),
    ga4PropertyIdDetected: Boolean(env.GA4_PROPERTY_ID),
    googleCredentialsDetected: Boolean(env.GOOGLE_APPLICATION_CREDENTIALS_JSON),
    measurementIdKnown: GA4_MEASUREMENT_ID,
  };
}

export function parseGoogleCredentialsJson(
  value: string,
): GoogleServiceAccountCredentials {
  const parsed = JSON.parse(value) as Partial<GoogleServiceAccountCredentials>;

  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("Google credentials JSON must include client_email and private_key.");
  }

  return {
    ...parsed,
    client_email: parsed.client_email,
    private_key: parsed.private_key.replace(/\\n/g, "\n"),
  };
}

export function getGa4Config(env: Ga4Env = process.env): Ga4Config {
  const errors: string[] = [];

  if (!env.GA4_PROPERTY_ID) {
    errors.push("Add the numeric GA4 property ID.");
  }

  if (!env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    errors.push("Add Google service account credentials JSON.");
  }

  if (errors.length > 0) {
    return {
      ok: false,
      propertyId: null,
      credentials: null,
      errors,
    };
  }

  try {
    return {
      ok: true,
      propertyId: env.GA4_PROPERTY_ID as string,
      credentials: parseGoogleCredentialsJson(
        env.GOOGLE_APPLICATION_CREDENTIALS_JSON as string,
      ),
      errors: [],
    };
  } catch {
    return {
      ok: false,
      propertyId: null,
      credentials: null,
      errors: ["Google service account credentials JSON could not be parsed."],
    };
  }
}

export function createGa4Client(env: Ga4Env = process.env) {
  const config = getGa4Config(env);

  if (!config.ok) {
    return null;
  }

  return new BetaAnalyticsDataClient({
    credentials: config.credentials,
  });
}
