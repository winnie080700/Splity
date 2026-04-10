import { getApiBaseUrl } from "./config";
import { ApiError, isProblemDetails, type ApiProblemDetails } from "./errors";

type AccessTokenProvider = (() => Promise<string | null | undefined> | string | null | undefined) | null;

let accessTokenProvider: AccessTokenProvider = null;

async function tryParseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("json")) {
    return response.json();
  }

  const text = await response.text();
  return text.trim().length > 0 ? text : null;
}

function buildError(response: Response, body: unknown) {
  if (isProblemDetails(body)) {
    return new ApiError(body.detail || body.title || `Request failed: ${response.status}`, {
      status: response.status,
      traceId: body.traceId,
      errorCode: body.errorCode,
      problem: body
    });
  }

  const message = typeof body === "string" && body.length > 0
    ? body
    : `Request failed: ${response.status}`;

  return new ApiError(message, { status: response.status });
}

export function setAccessTokenProvider(provider: AccessTokenProvider) {
  accessTokenProvider = provider;
}

async function getAccessToken() {
  if (!accessTokenProvider) {
    return null;
  }

  return (await accessTokenProvider()) ?? null;
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const accessToken = await getAccessToken();
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.headers ?? {})
    }
  });

  const body = response.status === 204 ? null : await tryParseResponseBody(response);

  if (!response.ok) {
    throw buildError(response, body);
  }

  return body as T;
}

export type { ApiProblemDetails };
