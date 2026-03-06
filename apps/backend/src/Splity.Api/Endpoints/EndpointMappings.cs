namespace Splity.Api.Endpoints;

public static class EndpointMappings
{
    public static IEndpointRouteBuilder MapSplityEndpoints(this IEndpointRouteBuilder app)
    {
        GroupEndpoints.Map(app);
        ParticipantEndpoints.Map(app);
        BillEndpoints.Map(app);
        SettlementEndpoints.Map(app);

        return app;
    }
}
