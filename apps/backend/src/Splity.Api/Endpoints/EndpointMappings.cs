namespace Splity.Api.Endpoints;

public static class EndpointMappings
{
    public static IEndpointRouteBuilder MapSplityEndpoints(this IEndpointRouteBuilder app)
    {
        AuthEndpoints.Map(app);
        GroupEndpoints.Map(app);
        InvitationEndpoints.Map(app);
        ParticipantEndpoints.Map(app);
        BillEndpoints.Map(app);
        SettlementEndpoints.Map(app);
        SettlementShareEndpoints.Map(app);

        return app;
    }
}
