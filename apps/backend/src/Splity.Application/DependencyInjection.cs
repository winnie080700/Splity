using Microsoft.Extensions.DependencyInjection;
using Splity.Application.Calculations;
using Splity.Application.Services;

namespace Splity.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IBillCalculator, BillCalculator>();
        services.AddScoped<ISettlementCalculator, SettlementCalculator>();

        services.AddScoped<IGroupsService, GroupsService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IParticipantsService, ParticipantsService>();
        services.AddScoped<IBillsService, BillsService>();
        services.AddScoped<ISettlementsService, SettlementsService>();
        services.AddScoped<ISettlementSharesService, SettlementSharesService>();

        return services;
    }
}
