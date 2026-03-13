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

export function getApiErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Something went wrong.";
}
