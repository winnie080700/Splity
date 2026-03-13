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
Allowed frontend origins are configured in:
- `apps/backend/src/Splity.Api/appsettings.json`
- `apps/backend/src/Splity.Api/appsettings.Development.json`

## Run Frontend
```powershell
cd apps/frontend
npm install
npm run dev
```

Frontend API base URL comes from `apps/frontend/.env.example` via `VITE_API_BASE_URL`.

## Root Scripts
```powershell
npm run install:frontend
npm run dev
npm run build
```

Useful root-level scripts:
- `npm run dev`: start frontend and backend together
- `npm run dev:frontend`: start only Vite frontend
- `npm run dev:backend`: start only ASP.NET Core backend
- `npm run install:frontend`: install frontend dependencies
- `npm run build:frontend`: build frontend
- `npm run build:backend`: build backend with the workspace-local `.dotnet` home
- `npm run build`: build frontend and backend

## Run Full Stack
```powershell
cd C:\Users\Up-Devlabs\Documents\Splity
npm run dev
```

Before the first full-stack run, install frontend dependencies once:
```powershell
cd apps/frontend
npm install
```

This starts:
- frontend from `apps/frontend` with Vite
- backend from `apps/backend/src/Splity.Api` with a shared backend runner script that sets `DOTNET_CLI_HOME` consistently

VS Code also supports one-click startup via `.vscode/launch.json`:
- `Launch Backend`
- `Launch Frontend`
- `Launch Full Stack`

## API Layer
- Frontend requests are centralized in `packages/api-client`
- The client now parses ASP.NET Core ProblemDetails responses and exposes clearer error messages on the frontend

## Notes
- Development backend defaults to in-memory database.
- Production configuration expects MySQL in `ConnectionStrings:DefaultConnection`.
- Startup seeds demo data if the database is empty.
