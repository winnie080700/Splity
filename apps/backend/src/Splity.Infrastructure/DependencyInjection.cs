using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Splity.Application.Abstractions;
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
        services.AddScoped<IPasswordResetEmailSender, SmtpPasswordResetEmailSender>();
        services.AddScoped<IEmailVerificationSender, SmtpEmailVerificationSender>();
        services.AddScoped<IUnitOfWork>(provider => provider.GetRequiredService<SplityDbContext>());

        return services;
    }
}
