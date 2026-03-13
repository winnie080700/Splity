const DEFAULT_API_BASE_URL = "http://localhost:5204";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getApiBaseUrl() {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const baseUrl = env?.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL;
  return trimTrailingSlash(baseUrl);
}
