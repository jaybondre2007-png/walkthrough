# ExpenseTrac

A professional personal finance tracker with authentication (including 2FA), income and expense tracking, budgets with proactive alerts, in-depth analytics, and data export.

## Stack

- **Client:** React + TypeScript + Vite, Tailwind CSS v4, React Query, React Router, Recharts, jsPDF, lucide-react
- **Server:** Express + TypeScript, Prisma ORM, Zod validation, JWT auth (httpOnly cookies), bcrypt, otplib (TOTP 2FA)
- **Database:** SQLite for local development (zero setup). Swap to PostgreSQL for production — see below.

## Getting started

### 1. Server

```bash
cd server
npm install
npm run prisma:migrate   # creates the local SQLite database
npm run seed              # optional: adds a demo user with sample data
npm run dev                # starts the API on http://localhost:4000
```

### 2. Client

```bash
cd client
npm install
npm run dev   # starts the app on http://localhost:5173
```

The Vite dev server proxies `/api` requests to the backend, so just open http://localhost:5173.

**Demo login** (after running `npm run seed`): `demo@expensetrac.app` / `demo1234` — or register your own account from the login screen.

## Features

- **Authentication** — email/password accounts, JWT sessions via httpOnly cookies, per-user data isolation, change password
- **Two-factor authentication** — TOTP-based 2FA (Google Authenticator, Authy, etc.) with QR-code setup and a code challenge at login
- **Dashboard** — quick-glance monthly overview: spend, budget remaining, top category, recent activity, and a proactive budget-pace alert banner
- **Analytics** — a dedicated page with income vs. expense trends, net/savings-rate stat tiles, expense and income category breakdowns, and monthly spending trend
- **Expenses** — add/edit/delete, search, filter by category, multi-currency entry with automatic conversion
- **Income** — track salary, business, freelance, investment, pocket money, gifts, and other income by category
- **Export** — download expenses or income as CSV (opens in Excel) or a formatted PDF report
- **Categories** — separate expense and income categories, custom color/icon, monthly budgets with progress bars
- **Budgets & alerts** — set an overall monthly budget; get an in-app warning when your spending pace is on track to exceed it before the month is up (configurable threshold)
- **Settings** — account info, password, two-factor authentication, light/dark appearance, monthly budget, notification preferences, base currency, custom exchange rates

## How the budget alert works

Set a **monthly budget** and an **alert threshold** (default 50%) in Settings. Each day, ExpenseTrac compares how much of your budget you've spent against how much of the month has elapsed:

- **Warning** — you've spent more than the threshold, and that spend is outpacing the days elapsed (e.g., 60% of budget gone with only 40% of the month passed).
- **Critical** — you've spent 100%+ of your budget already.

The banner shows on the Dashboard with the amount spent, projected month-end total, and a link to adjust the budget.

## Switching to PostgreSQL (production / cloud)

1. In `server/prisma/schema.prisma`, change the datasource provider:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Point `DATABASE_URL` in `server/.env` at your Postgres instance, e.g.:
   ```
   DATABASE_URL="postgresql://user:password@host:5432/expensetrac?schema=public"
   ```
   A `docker-compose.yml` is included at the repo root if you want to run Postgres locally via Docker:
   ```bash
   docker compose up -d
   ```
3. Re-run migrations: `npm run prisma:migrate`

## Security notes

- Set a strong, random `JWT_SECRET` in `server/.env` before deploying anywhere beyond local dev.
- Cookies are `httpOnly`/`sameSite=lax`; set `secure: true` in `server/src/auth.ts` once served over HTTPS.
- Two-factor secrets are stored in the database in plaintext (standard practice for TOTP — the same approach used by most password managers); for a production deployment, consider encrypting `User.twoFactorSecret` at rest.
- CSV/PDF export runs entirely client-side against your own data — no third-party services involved.
