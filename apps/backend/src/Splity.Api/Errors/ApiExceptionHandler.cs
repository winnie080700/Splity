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
                    "validation_error");
                return true;
            case EntityNotFoundException notFoundException:
                await WriteProblemAsync(
                    httpContext,
                    "Not found",
                    notFoundException.Message,
                    StatusCodes.Status404NotFound,
                    "not_found");
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
