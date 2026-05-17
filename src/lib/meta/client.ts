export const META_API_VERSION = "v21.0";
const META_GRAPH_BASE_URL = "https://graph.facebook.com";

export type MetaEnv = Record<string, string | undefined>;

export type MetaConfig = {
  accessToken: string;
  adAccountId: string;
  apiVersion: string;
};

export type MetaClient = {
  get: <T>(
    path: string,
    params?: Record<string, string | number | boolean>,
  ) => Promise<T>;
};

export function getMetaEnvStatus(env: MetaEnv = process.env) {
  return {
    metaAdsEnvDetected: Boolean(env.META_ACCESS_TOKEN && env.META_AD_ACCOUNT_ID),
    metaAccessTokenDetected: Boolean(env.META_ACCESS_TOKEN),
    metaAdAccountDetected: Boolean(env.META_AD_ACCOUNT_ID),
  };
}

export function getMetaConfig(env: MetaEnv = process.env): MetaConfig | null {
  if (!env.META_ACCESS_TOKEN || !env.META_AD_ACCOUNT_ID) {
    return null;
  }

  return {
    accessToken: env.META_ACCESS_TOKEN,
    adAccountId: formatAdAccountId(env.META_AD_ACCOUNT_ID),
    apiVersion: META_API_VERSION,
  };
}

export function formatAdAccountId(value: string) {
  return value.startsWith("act_") ? value : `act_${value}`;
}

export function createMetaClient(
  config: MetaConfig,
  fetcher: typeof fetch = fetch,
): MetaClient {
  return {
    async get<T>(
      path: string,
      params: Record<string, string | number | boolean> = {},
    ) {
      const url = new URL(
        `${META_GRAPH_BASE_URL}/${config.apiVersion}/${path.replace(/^\/+/, "")}`,
      );

      url.searchParams.set("access_token", config.accessToken);

      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, String(value));
      }

      const response = await fetcher(url);
      const body = (await response.json()) as T & {
        error?: { message?: string };
      };

      if (!response.ok) {
        throw new Error(body.error?.message ?? "Meta Marketing API request failed.");
      }

      return body as T;
    },
  };
}

export function getMetaClient(
  env: MetaEnv = process.env,
  fetcher: typeof fetch = fetch,
) {
  const config = getMetaConfig(env);

  if (!config) {
    return null;
  }

  return createMetaClient(config, fetcher);
}
