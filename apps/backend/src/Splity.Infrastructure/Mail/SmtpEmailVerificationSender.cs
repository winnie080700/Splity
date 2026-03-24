using System.Net;
using System.Net.Mail;
using System.Security.Authentication;
using Microsoft.Extensions.Logging;
using Splity.Application.Abstractions;
using Splity.Application.Exceptions;

namespace Splity.Infrastructure.Mail;

public sealed class SmtpEmailVerificationSender(
    SmtpOptions options,
    ILogger<SmtpEmailVerificationSender> logger) : IEmailVerificationSender
{
    public async Task SendVerificationCodeAsync(
        string email,
        string displayName,
        string verificationCode,
        CancellationToken cancellationToken)
    {
        ValidateConfiguration();

        using var message = new MailMessage
        {
            From = new MailAddress(options.FromAddress!, options.FromName),
            Subject = "Your Splity email verification code",
            Body = BuildHtmlBody(displayName, verificationCode),
            IsBodyHtml = true
        };

        message.To.Add(email);
        message.AlternateViews.Add(
            AlternateView.CreateAlternateViewFromString(
                BuildTextBody(displayName, verificationCode),
                null,
                System.Net.Mime.MediaTypeNames.Text.Plain));

        using var client = new SmtpClient(options.Host!, options.Port)
        {
            EnableSsl = options.EnableSsl,
            DeliveryMethod = SmtpDeliveryMethod.Network
        };

        if (!string.IsNullOrWhiteSpace(options.Username))
        {
            client.Credentials = new NetworkCredential(options.Username, options.Password);
        }

        try
        {
            await client.SendMailAsync(message, cancellationToken);
            logger.LogInformation("Email verification code sent to {Email}", email);
        }
        catch (Exception exception) when (exception is SmtpException or InvalidOperationException or AuthenticationException)
        {
            logger.LogError(exception, "Failed to send verification email to {Email}", email);
            throw new ExternalServiceException(
                "Unable to send verification email right now. Please try again later.",
                "auth_email_verification_send_failed");
        }
    }

    private void ValidateConfiguration()
    {
        if (string.IsNullOrWhiteSpace(options.Host) || string.IsNullOrWhiteSpace(options.FromAddress))
        {
            logger.LogError("SMTP configuration is incomplete. Host or FromAddress is missing.");
            throw new ExternalServiceException(
                "Unable to send verification email right now. Please try again later.",
                "auth_email_verification_send_failed");
        }
    }

    private static string BuildTextBody(string displayName, string verificationCode)
    {
        return
$@"Hello {displayName},

Use the following verification code to confirm your Splity email address:
{verificationCode}

This code expires in 10 minutes.

If you did not request this, you can ignore this email.

Splity";
    }

    private static string BuildHtmlBody(string displayName, string verificationCode)
    {
        var safeName = WebUtility.HtmlEncode(displayName);
        var safeCode = WebUtility.HtmlEncode(verificationCode);

        return
$@"<html>
  <body style=""font-family:Segoe UI,Arial,sans-serif;color:#0f172a;line-height:1.6;"">
    <p>Hello {safeName},</p>
    <p>Use the following verification code to confirm your Splity email address:</p>
    <p style=""font-size:24px;font-weight:700;letter-spacing:0.18em;"">{safeCode}</p>
    <p>This code expires in 10 minutes.</p>
    <p>If you did not request this, you can ignore this email.</p>
    <p>Splity</p>
  </body>
</html>";
    }
}
