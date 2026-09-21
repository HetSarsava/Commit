# Commit — local business operating system

This repository contains the first database-backed Commit slice:

`Lead → Customer → Catalogue → Quotation → Sales Order`

The existing prototype screens remain available for later milestones.


Commit uses native local development services and does not require Docker.

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- PostgreSQL for Windows, installed as a normal Windows service

During PostgreSQL installation, create or note the password for the local `postgres` user. The default `.env.example` assumes `postgres` / `postgres`; change `.env` if your installation uses another password.

## Quick Start

Install PostgreSQL for Windows and make sure its service is running. Then run:

```powershell
npm install
npm run dev
```

`npm run dev` will:

1. Create `.env` from `.env.example` if it does not exist.
2. Validate the local PostgreSQL configuration.
3. Detect PostgreSQL on the configured host and port.
4. Attempt to start a stopped PostgreSQL Windows service when possible.
5. Create the local target database if it does not exist and the configured account has permission.
6. Apply pending Prisma migrations.
7. Ensure demo data exists without duplicating it.
8. Start the backend and frontend in one terminal.

Open the displayed frontend URL, normally http://localhost:3000/login. The backend is normally available at http://localhost:4000/api.

If PostgreSQL was installed with a different username, password, port or host, copy `.env.example` to `.env` and update `DATABASE_URL` before running `npm run dev`.

## PostgreSQL setup on Windows

Install PostgreSQL using the standard Windows installer. Ensure the PostgreSQL service is running in Windows Services. The startup script recognizes common service names such as `postgresql-x64-16` and `postgresql-x64-17` and attempts to start a stopped service.

If the database does not exist and automatic creation is not permitted, create it from SQL Shell/psql or pgAdmin:

```sql
CREATE DATABASE commit;
```

Then rerun:

```powershell
npm run dev
```

The application never drops or resets a database during normal startup.

## Demo credentials

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@commit.local` | `Admin123!` |
| Sales | `sales@commit.local` | `Sales123!` |

## Working demo flow

1. Sign in as Sales.
2. Open a lead and associate a customer if needed.
3. Create a quotation with two products.
4. Save it, review the backend-calculated totals, and accept it.
5. Create a sales order from the accepted quotation.
6. Refresh and open Sales Orders to verify the persisted customer, items and totals.

## Manual development commands

The one-command startup is recommended. These commands remain available for debugging:

```powershell
npm run db:migrate
npm run db:seed
npm run db:reset
npm run db:studio
npm run dev:api
npm run dev:web
```

`db:reset` is explicit and destructive for the seeded demo organization only. It is never run automatically by `npm run dev`.

## Troubleshooting

- If PostgreSQL is not detected, install PostgreSQL for Windows and start its Windows service. If the error names a service, use Windows Services or run `net start <service-name>` from an elevated PowerShell window.
- If PostgreSQL is reachable but authentication fails, update the username/password in `.env` to match the local PostgreSQL installation.
- If the target database does not exist and automatic creation fails, create `commit` in SQL Shell/psql or pgAdmin, then rerun `npm run dev`.
- If a migration fails, inspect the error and run `npm run db:migrate` manually after correcting the database configuration.
- If port 5432, 3000 or 4000 is already in use, stop the conflicting local process or update `DATABASE_URL`, `API_PORT`, `WEB_PORT`, `NEXT_PUBLIC_API_URL` and `FRONTEND_URL` consistently in `.env`.
- If browser requests are unauthorized after changing the API URL, log out, clear the `commit_session` cookie, and log in again.
- `npm run db:studio` opens Prisma Studio for inspecting local records.

## Tests and builds

```powershell
npm test
npm run build
```

With native PostgreSQL running and `.env` configured, the HTTP integration flow can be exercised with:

```powershell
npm run test:integration
```

The API unit tests cover money-safe quotation calculations, acceptance and duplicate conversion behavior. The production build compiles both applications.

## Security note

Local sessions use an HTTP-only cookie signed with `AUTH_SECRET`, passwords are hashed with bcrypt, all business queries are organization-scoped, and API responses use safe error messages. Replace local secrets and configure HTTPS before any deployment.
