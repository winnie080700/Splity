namespace Splity.Application.Exceptions;

public sealed class DomainValidationException : Exception
{
    public DomainValidationException(string message, string errorCode = "validation_error")
        : base(message)
    {
        ErrorCode = errorCode;
    }

    public string ErrorCode { get; }
}
