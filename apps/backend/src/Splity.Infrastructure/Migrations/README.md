Run migrations from `apps/backend/src/Splity.Api`:

```powershell
$env:DOTNET_CLI_HOME='c:\Users\Up-Devlabs\Documents\Splity\.dotnet'
dotnet ef migrations add InitialCreate --project ..\Splity.Infrastructure\Splity.Infrastructure.csproj --startup-project .\Splity.Api.csproj --output-dir Migrations
dotnet ef database update --project ..\Splity.Infrastructure\Splity.Infrastructure.csproj --startup-project .\Splity.Api.csproj
```
