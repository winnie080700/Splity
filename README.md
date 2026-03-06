# Splity

Split bill app with React + ASP.NET Core Web API + MySQL.

## Repo Structure
- `apps/frontend`: React + TypeScript + Tailwind UI
- `apps/backend`: ASP.NET Core solution (`Domain`, `Application`, `Infrastructure`, `Api`)
- `packages/api-client`: typed API client consumed by frontend
- `docs`: architecture and API docs

## Run Backend
```powershell
cd apps/backend/src/Splity.Api
$env:DOTNET_CLI_HOME='c:\Users\Up-Devlabs\Documents\Splity\.dotnet'
dotnet restore
dotnet run
```

Backend runs on `http://localhost:5204` (see `launchSettings.json`).

## Run Frontend
```powershell
cd apps/frontend
npm install
npm run dev
```

Frontend default API base URL is `http://localhost:5204`.

## Notes
- Development backend defaults to in-memory database.
- Production configuration expects MySQL in `ConnectionStrings:DefaultConnection`.
- Startup seeds demo data if the database is empty.
