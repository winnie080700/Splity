using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Splity.Application.Abstractions;
using Splity.Infrastructure.Identity;
using Splity.Infrastructure.Mail;
using Splity.Infrastructure.Persistence;
using Splity.Infrastructure.Repositories;
using Splity.Infrastructure.Security;

namespace Splity.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var smtpOptions = new SmtpOptions
        {
            Host = configuration["Smtp:Host"],
            Port = int.TryParse(configuration["Smtp:Port"], out var smtpPort) ? smtpPort : 587,
            EnableSsl = bool.TryParse(configuration["Smtp:EnableSsl"], out var enableSsl) ? enableSsl : true,
            Username = configuration["Smtp:Username"],
            Password = configuration["Smtp:Password"],
            FromAddress = configuration["Smtp:FromAddress"],
            FromName = configuration["Smtp:FromName"] ?? "Splity"
        };

        services.AddDbContext<SplityDbContext>(options =>
        {
            var provider = configuration["Database:Provider"]?.Trim().ToLowerInvariant();
            if (provider == "inmemory")
            {
                options.UseInMemoryDatabase("splity");
                return;
            }

            var connectionString = configuration.GetConnectionString("DefaultConnection");
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                throw new InvalidOperationException("ConnectionStrings:DefaultConnection is required for MySQL.");
            }

            options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString));
        });

        services.AddScoped<IGroupRepository, GroupRepository>();
        services.AddScoped<IAppUserRepository, AppUserRepository>();
        services.AddScoped<IParticipantRepository, ParticipantRepository>();
        services.AddScoped<IBillRepository, BillRepository>();
        services.AddScoped<ISettlementTransferConfirmationRepository, SettlementTransferConfirmationRepository>();
        services.AddScoped<ISettlementShareLinkRepository, SettlementShareLinkRepository>();
        services.AddSingleton<IPasswordHasher, PasswordHasher>();
        services.AddSingleton<ITokenProvider, JwtTokenProvider>();
        services.AddSingleton(smtpOptions);
        services.AddSingleton(sp =>
        {
            var authority = configuration["Clerk:Authority"]?.Trim();
            if (string.IsNullOrWhiteSpace(authority))
            {
                throw new InvalidOperationException("Clerk:Authority is required.");
            }

            var jwksUrl = configuration["Clerk:JwksUrl"]?.Trim();
            if (string.IsNullOrWhiteSpace(jwksUrl))
            {
                jwksUrl = $"{authority.TrimEnd('/')}/.well-known/jwks.json";
            }

            return new ClerkJwksProvider(new HttpClient
            {
                Timeout = TimeSpan.FromSeconds(15)
            }, jwksUrl);
        });
        services.AddSingleton<IExternalIdentityUserProvider>(sp =>
        {
            var apiUrl = configuration["Clerk:ApiUrl"]?.Trim();
            if (string.IsNullOrWhiteSpace(apiUrl))
            {
                apiUrl = "https://api.clerk.com";
            }

            var secretKey = configuration["Clerk:SecretKey"]?.Trim();
            return new ClerkUserClient(new HttpClient
            {
                Timeout = TimeSpan.FromSeconds(15)
            }, apiUrl, secretKey ?? string.Empty);
        });
        services.AddScoped<IPasswordResetEmailSender, SmtpPasswordResetEmailSender>();
        services.AddScoped<IEmailVerificationSender, SmtpEmailVerificationSender>();
        services.AddScoped<IUnitOfWork>(provider => provider.GetRequiredService<SplityDbContext>());

        return services;
    }
}
