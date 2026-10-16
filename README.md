# Glenhaven Salt Ops

Internal app for Glenhaven's salt resale operation: tracks deliveries from order
to cash — supplier per-ton pricing, % markup, triaxle loads with est → actual
tonnage reconciliation, sub invoicing, supplier bills, payments both directions,
and margin reporting per delivery / sub / site / season.

**Stack:** Next.js (App Router, TypeScript, Tailwind) · Supabase (Postgres + Auth + RLS) · Render (hosting) · GitHub (source of truth)

## Project layout

```
src/app/                  App Router pages (login, dashboard)
src/lib/supabase/         Supabase browser/server/middleware clients
supabase/migrations/      Database schema (apply in order)
supabase/seed.sql         Sample catalog data (idempotent)
render.yaml               Render service definition (auto-deploy from GitHub)
```

## Setup

### 1. Create the Supabase project

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. Apply the schema: in the Supabase dashboard open **SQL Editor**, paste the
   contents of `supabase/migrations/0001_init.sql`, and run it.
3. (Optional) Load sample data the same way with `supabase/seed.sql`.
   - CLI alternative: `supabase link` + `supabase db push`, then run the seed.

### 2. Create the first user

1. In the Supabase dashboard: **Authentication → Users → Add user** (email +
   password). A row in `profiles` is created automatically with role `viewer`.
2. Promote yourself to admin — in the SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where id = '<your-user-uuid>';
   ```
3. Roles: `admin` (everything incl. prices/users), `office` (daily entry),
   `viewer` (read-only).

### 3. Run locally

```bash
cp .env.example .env.local   # fill in values from Supabase → Project Settings → API
npm install
npm run dev
```

Open http://localhost:3000 — you should be redirected to the login page.

### 4. Deploy (GitHub → Render)

1. Push this repo to GitHub.
2. In [Render](https://render.com): **New → Web Service → connect the GitHub
   repo**. Render detects `render.yaml` automatically (build: `npm ci && npm run
   build`, start: `npm start`).
3. Set the three env vars from `.env.example` in the Render service settings
   (they are marked `sync: false`, so they are never stored in the repo).
4. Every push to `main` auto-deploys.

## Daily workflow (as phases ship)

1. **Phase 1 (this commit):** auth, schema, roles, dashboard shell.
2. Phase 2: catalog CRUD (seasons, suppliers, products, subs, sites, prices, markup rules).
3. Phase 3: delivery pipeline tracker (order → confirmations → delivered → reconciled → paid both sides).
4. Phase 4: sub invoices, supplier bills, payments, aging.
5. Phase 5: margin reports + season dashboard.
6. Phase 6: audit log UI, CSV import, backups.
