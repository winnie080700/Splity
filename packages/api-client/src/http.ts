import { getApiBaseUrl } from "./config";
import { ApiError, isProblemDetails, type ApiProblemDetails } from "./errors";

function getStoredAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem("splity.auth");
  if (!raw) {
    return null;
  }

  try
  {
    const parsed = JSON.parse(raw) as { accessToken?: string };
    return parsed.accessToken ?? null;
  }
  catch
  {
    return null;
  }
}

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

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const accessToken = getStoredAccessToken();
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
