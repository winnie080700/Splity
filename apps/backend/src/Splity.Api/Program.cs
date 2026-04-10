using Splity.Api.Endpoints;
using Splity.Api.Errors;
using Splity.Application;
using Splity.Infrastructure;
using Splity.Infrastructure.Identity;
using Splity.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;

var builder = WebApplication.CreateBuilder(args);
var allowedOrigins = builder.Configuration.GetSection("Frontend:AllowedOrigins").Get<string[]>() ??
    ["http://localhost:5173", "http://127.0.0.1:5173"];
var clerkAuthority = builder.Configuration["Clerk:Authority"]?.Trim()
    ?? throw new InvalidOperationException("Clerk:Authority is required.");
var clerkAuthorizedParties = builder.Configuration.GetSection("Clerk:AuthorizedParties").Get<string[]>() ?? [];
var clerkJwksUrl = builder.Configuration["Clerk:JwksUrl"]?.Trim();
if (string.IsNullOrWhiteSpace(clerkJwksUrl))
{
    clerkJwksUrl = $"{clerkAuthority.TrimEnd('/')}/.well-known/jwks.json";
}

var clerkJwksProvider = new ClerkJwksProvider(new HttpClient
{
    Timeout = TimeSpan.FromSeconds(15)
}, clerkJwksUrl);

builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddHealthChecks();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = false,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = clerkAuthority,
            NameClaimType = JwtRegisteredClaimNames.Name,
            IssuerSigningKeyResolver = (_, _, _, _) =>
                clerkJwksProvider.GetSigningKeysAsync(CancellationToken.None).GetAwaiter().GetResult(),
            ClockSkew = TimeSpan.FromMinutes(2)
        };
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = context =>
            {
                if (clerkAuthorizedParties.Length == 0)
                {
                    return Task.CompletedTask;
                }

                var authorizedParty = context.Principal?.FindFirst("azp")?.Value;
                if (string.IsNullOrWhiteSpace(authorizedParty) ||
                    !clerkAuthorizedParties.Contains(authorizedParty, StringComparer.OrdinalIgnoreCase))
                {
                    context.Fail("The Clerk token is not valid for this frontend.");
                }

                return Task.CompletedTask;
            }
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});
builder.Services.AddOpenApi();

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

var app = builder.Build();

app.UseExceptionHandler();
app.UseHttpsRedirection();
app.UseCors("frontend");
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapHealthChecks("/health");
app.MapSplityEndpoints();

await InitializeDatabaseAsync(app.Services);

app.Run();

static async Task InitializeDatabaseAsync(IServiceProvider services)
{
    using var scope = services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<SplityDbContext>();
    await DatabaseInitializer.InitializeAsync(dbContext);
}

