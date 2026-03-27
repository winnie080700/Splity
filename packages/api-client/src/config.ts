// Default to same-origin requests so the app can work behind a single
// frontend tunnel or reverse proxy without exposing the backend separately.
const DEFAULT_API_BASE_URL = "";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getApiBaseUrl() {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const baseUrl = env?.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL;
  return trimTrailingSlash(baseUrl);
}
