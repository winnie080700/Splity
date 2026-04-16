using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Splity.Application.Exceptions;

namespace Splity.Api.Errors;

public sealed class ApiExceptionHandler(ILogger<ApiExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        switch (exception)
        {
            case DomainValidationException validationException:
                await WriteProblemAsync(
                    httpContext,
                    "Validation error",
                    validationException.Message,
                    StatusCodes.Status400BadRequest,
                    validationException.ErrorCode);
                return true;
            case ExternalServiceException externalServiceException:
                logger.LogError(exception, "External service failure for {Path}", httpContext.Request.Path);
                await WriteProblemAsync(
                    httpContext,
                    "Service unavailable",
                    externalServiceException.Message,
                    StatusCodes.Status503ServiceUnavailable,
                    externalServiceException.ErrorCode);
                return true;
            case EntityNotFoundException notFoundException:
                await WriteProblemAsync(
                    httpContext,
                    "Not found",
                    notFoundException.Message,
                    StatusCodes.Status404NotFound,
                    "not_found");
                return true;
            case DbUpdateConcurrencyException:
                logger.LogWarning(exception, "DbUpdateConcurrencyException for {Path}", httpContext.Request.Path);
                await WriteProblemAsync(
                    httpContext,
                    "No new changes",
                    "No new changes were applied. The data may already be up to date.",
                    StatusCodes.Status409Conflict,
                    "concurrency_conflict");
                return true;
            default:
                logger.LogError(exception, "Unhandled exception for {Path}", httpContext.Request.Path);
                await WriteProblemAsync(
                    httpContext,
                    "Server error",
                    "An unexpected error occurred.",
                    StatusCodes.Status500InternalServerError,
                    "server_error");
                return true;
        }
    }

    private static async Task WriteProblemAsync(
        HttpContext httpContext,
        string title,
        string detail,
        int statusCode,
        string errorCode)
    {
        var problem = new ProblemDetails
        {
            Title = title,
            Detail = detail,
            Status = statusCode,
            Instance = httpContext.Request.Path
        };

        problem.Extensions["traceId"] = httpContext.TraceIdentifier;
        problem.Extensions["errorCode"] = errorCode;

        await Results.Problem(problem).ExecuteAsync(httpContext);
    }
}
