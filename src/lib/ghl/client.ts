export const GHL_API_VERSION = "2021-07-28";
const GHL_BASE_URL = "https://services.leadconnectorhq.com";

export type GhlEnv = Record<string, string | undefined>;

export type GhlConfig = {
  apiKey: string;
  locationId: string;
  apiVersion: string;
};

export type GhlClient = {
  get: <T>(path: string, params?: Record<string, string | number>) => Promise<T>;
  post: <T>(path: string, body?: Record<string, unknown>) => Promise<T>;
};

export function getGhlEnvStatus(env: GhlEnv = process.env) {
  return {
    ghlEnvDetected: Boolean(env.GHL_API_KEY && env.GHL_LOCATION_ID),
    ghlApiKeyDetected: Boolean(env.GHL_API_KEY),
    ghlLocationIdDetected: Boolean(env.GHL_LOCATION_ID),
  };
}

export function getGhlConfig(env: GhlEnv = process.env): GhlConfig | null {
  if (!env.GHL_API_KEY || !env.GHL_LOCATION_ID) {
    return null;
  }

  return {
    apiKey: env.GHL_API_KEY,
    locationId: env.GHL_LOCATION_ID,
    apiVersion: GHL_API_VERSION,
  };
}

function headers(config: GhlConfig) {
  return {
    Authorization: `Bearer ${config.apiKey}`,
    Version: config.apiVersion,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

async function parseJson<T>(response: Response) {
  const body = (await response.json().catch(() => ({}))) as T & {
    message?: string;
    error?: string | { message?: string };
  };

  if (!response.ok) {
    const error =
      typeof body.error === "string"
        ? body.error
        : body.error?.message ?? body.message ?? "GoHighLevel API request failed.";
    throw new Error(error);
  }

  return body as T;
}

export function createGhlClient(
  config: GhlConfig,
  fetcher: typeof fetch = fetch,
): GhlClient {
  return {
    async get<T>(path: string, params: Record<string, string | number> = {}) {
      const url = new URL(`${GHL_BASE_URL}/${path.replace(/^\/+/, "")}`);

      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, String(value));
      }

      return parseJson<T>(
        await fetcher(url, {
          method: "GET",
          headers: headers(config),
        }),
      );
    },
    async post<T>(path: string, body: Record<string, unknown> = {}) {
      const url = new URL(`${GHL_BASE_URL}/${path.replace(/^\/+/, "")}`);

      return parseJson<T>(
        await fetcher(url, {
          method: "POST",
          headers: headers(config),
          body: JSON.stringify(body),
        }),
      );
    },
  };
}

export function getGhlClient(
  env: GhlEnv = process.env,
  fetcher: typeof fetch = fetch,
) {
  const config = getGhlConfig(env);

  if (!config) {
    return null;
  }

  return createGhlClient(config, fetcher);
}
