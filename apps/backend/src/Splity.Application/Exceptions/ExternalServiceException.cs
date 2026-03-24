namespace Splity.Application.Exceptions;

public sealed class ExternalServiceException : Exception
{
    public ExternalServiceException(string message, string errorCode = "external_service_error")
        : base(message)
    {
        ErrorCode = errorCode;
    }

    public string ErrorCode { get; }
}
