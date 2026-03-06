using Microsoft.AspNetCore.Diagnostics;
using Splity.Application.Exceptions;

namespace Splity.Api.Errors;

public sealed class ApiExceptionHandler(ILogger<ApiExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        switch (exception)
        {
            case DomainValidationException validationException:
                await Results.Problem(
                        title: "Validation error",
                        detail: validationException.Message,
                        statusCode: StatusCodes.Status400BadRequest)
                    .ExecuteAsync(httpContext);
                return true;
            case EntityNotFoundException notFoundException:
                await Results.Problem(
                        title: "Not found",
                        detail: notFoundException.Message,
                        statusCode: StatusCodes.Status404NotFound)
                    .ExecuteAsync(httpContext);
                return true;
            default:
                logger.LogError(exception, "Unhandled exception for {Path}", httpContext.Request.Path);
                await Results.Problem(
                        title: "Server error",
                        detail: "An unexpected error occurred.",
                        statusCode: StatusCodes.Status500InternalServerError)
                    .ExecuteAsync(httpContext);
                return true;
        }
    }
}
