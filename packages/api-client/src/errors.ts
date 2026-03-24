export type ApiProblemDetails = {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  traceId?: string;
  errorCode?: string;
};

export class ApiError extends Error {
  readonly status: number;
  readonly traceId?: string;
  readonly errorCode?: string;
  readonly problem?: ApiProblemDetails;

  constructor(message: string, options: {
    status: number;
    traceId?: string;
    errorCode?: string;
    problem?: ApiProblemDetails;
  }) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.traceId = options.traceId;
    this.errorCode = options.errorCode;
    this.problem = options.problem;
  }
}

export function isProblemDetails(value: unknown): value is ApiProblemDetails {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "title" in value || "detail" in value || "status" in value || "traceId" in value;
}

function getMessageFromObject(value: Record<string, unknown>) {
  const detail = typeof value.detail === "string" ? value.detail.trim() : "";
  if (detail.length > 0) {
    return detail;
  }

  const message = typeof value.message === "string" ? value.message.trim() : "";
  if (message.length > 0) {
    return message;
  }

  const title = typeof value.title === "string" ? value.title.trim() : "";
  if (title.length > 0) {
    return title;
  }

  return null;
}

function tryExtractMessage(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }

    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        return tryExtractMessage(parsed) ?? trimmed;
      }
      catch {
        return trimmed;
      }
    }

    return trimmed;
  }

  if (typeof value === "object") {
    return getMessageFromObject(value as Record<string, unknown>);
  }

  return null;
}

export function getApiErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return tryExtractMessage(error.problem ?? error.message) ?? "Something went wrong.";
  }

  if (error instanceof Error) {
    return tryExtractMessage(error.message) ?? "Something went wrong.";
  }

  return tryExtractMessage(error) ?? "Something went wrong.";
}
