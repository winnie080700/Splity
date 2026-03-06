# Splity Architecture

## Stack
- Frontend: React + TypeScript + Tailwind (Vite)
- Backend: ASP.NET Core Web API (`net10.0`) with Minimal APIs
- Database: MySQL via EF Core + Pomelo provider

## Backend Layers
- `Splity.Domain`: entities and enums (`Group`, `Participant`, `Bill`, `BillItem`, `BillFee`, `BillShare`, `PaymentContribution`)
- `Splity.Application`: business services + deterministic bill/settlement calculators
- `Splity.Infrastructure`: EF Core `DbContext`, repository implementations, database bootstrap
- `Splity.Api`: HTTP endpoints, exception mapping, OpenAPI, health checks

## Monetary + Settlement Rules
- Monetary values are normalized to 2 decimals
- Largest remainder method assigns cents deterministically (`participantId` ascending tie-break)
- Settlement uses net balance matching between debtors and creditors in deterministic greedy order

## Runtime
- Development defaults to in-memory provider (`appsettings.Development.json`)
- Production defaults to MySQL connection string (`ConnectionStrings:DefaultConnection`)
- Seed data is initialized at startup when database is empty
