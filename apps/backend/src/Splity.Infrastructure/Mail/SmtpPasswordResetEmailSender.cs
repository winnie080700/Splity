using System.Net;
using System.Net.Mail;
using System.Security.Authentication;
using Microsoft.Extensions.Logging;
using Splity.Application.Abstractions;
using Splity.Application.Exceptions;

namespace Splity.Infrastructure.Mail;

public sealed class SmtpPasswordResetEmailSender(
    SmtpOptions options,
    ILogger<SmtpPasswordResetEmailSender> logger) : IPasswordResetEmailSender
{
    public async Task SendTemporaryPasswordAsync(
        string email,
        string displayName,
        string temporaryPassword,
        CancellationToken cancellationToken)
    {
        ValidateConfiguration();

        using var message = new MailMessage
        {
            From = new MailAddress(options.FromAddress!, options.FromName),
            Subject = "Your Splity temporary password",
            Body = BuildHtmlBody(displayName, temporaryPassword),
            IsBodyHtml = true
        };

        message.To.Add(email);
        message.AlternateViews.Add(
            AlternateView.CreateAlternateViewFromString(
                BuildTextBody(displayName, temporaryPassword),
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
            logger.LogInformation("Temporary password email sent to {Email}", email);
        }
        catch (Exception exception) when (exception is SmtpException or InvalidOperationException or AuthenticationException)
        {
            logger.LogError(exception, "Failed to send temporary password email to {Email}", email);
            throw new ExternalServiceException(
                "Unable to send reset email right now. Please try again later.",
                "auth_reset_email_send_failed");
        }
    }

    private void ValidateConfiguration()
    {
        if (string.IsNullOrWhiteSpace(options.Host) || string.IsNullOrWhiteSpace(options.FromAddress))
        {
            logger.LogError("SMTP configuration is incomplete. Host or FromAddress is missing.");
            throw new ExternalServiceException(
                "Unable to send reset email right now. Please try again later.",
                "auth_reset_email_send_failed");
        }
    }

    private static string BuildTextBody(string displayName, string temporaryPassword)
    {
        return
$@"Hello {displayName},

We received a request to reset your Splity password.

Your temporary password is:
{temporaryPassword}

Use this temporary password to sign in to Splity. For security, keep this password private and only use it if you requested the reset.

If you did not request this reset, please ignore this message.

Splity";
    }

    private static string BuildHtmlBody(string displayName, string temporaryPassword)
    {
        var safeName = WebUtility.HtmlEncode(displayName);
        var safePassword = WebUtility.HtmlEncode(temporaryPassword);

        return
$@"<html>
  <body style=""font-family:Segoe UI,Arial,sans-serif;color:#0f172a;line-height:1.6;"">
    <p>Hello {safeName},</p>
    <p>We received a request to reset your Splity password.</p>
    <p>Your temporary password is:</p>
    <p style=""font-size:20px;font-weight:700;letter-spacing:0.08em;"">{safePassword}</p>
    <p>Use this temporary password to sign in to Splity. For security, keep this password private and only use it if you requested the reset.</p>
    <p>If you did not request this reset, please ignore this message.</p>
    <p>Splity</p>
  </body>
</html>";
    }
}
