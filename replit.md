# ApplyBlitz

A full-stack automated daily job application dashboard for Ahmed Ben Kilani — firing 150+ targeted applications per day across internships, free accommodation internships, and part-time remote jobs.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the Express API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/applyblitz run dev` — run the React frontend (served at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- **Frontend:** React + Vite + Tailwind CSS (dark GitHub-inspired theme)
- **Backend:** Express 5 (existing `api-server` artifact)
- **DB:** SQLite via `better-sqlite3` (file: `applyblitz.db` in api-server working dir)
- **Scrapers:** Remotive API, RemoteOK JSON, Jobicy API, Adzuna API
- **Email:** Nodemailer (SMTP configured in Settings)
- **Scheduler:** node-cron, daily at 08:00 Tunis time (UTC+1, Africa/Tunis)
- **Codegen:** Orval (OpenAPI → React Query hooks + Zod schemas)
- **CV uploads:** stored in `uploads/` in the api-server working dir

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod schemas (used by server routes)
- `artifacts/api-server/src/` — Express backend
  - `db/database.ts` — SQLite init, config helpers, dedup logic
  - `db/queries.ts` — application CRUD, stats queries
  - `scrapers/` — Remotive, RemoteOK, Jobicy, Adzuna scrapers
  - `apply/coverLetter.ts` — FR/EN template rendering
  - `apply/emailApply.ts` — Nodemailer email application sender
  - `scheduler/cron.ts` — node-cron daily scheduler
  - `notifications/emailDigest.ts` — daily email digest
  - `logs/sseLogger.ts` — SSE real-time log broadcast
  - `routes/` — all Express route handlers
- `artifacts/applyblitz/src/` — React frontend
- `uploads/` — Ahmed's CV PDF (relative to api-server cwd)
- `applyblitz.db` — SQLite database (relative to api-server cwd)

## Architecture decisions

- **SQLite over PostgreSQL:** This app runs solo for one user. better-sqlite3 is synchronous, zero-latency, and requires no DATABASE_URL provisioning.
- **SSE for log streaming:** Real-time log viewer uses EventSource. node-cron and scrapers emit to a central SSE broadcaster.
- **Cover letter language detection:** Detected from company name + source. Tunisian companies/sources → FR template. Override available per-application.
- **Deduplication:** SHA-like hash of (url + title) with 30-day window in SQLite. Prevents re-applying to the same job.
- **Priority companies** (Telnet, Vermeg, Sofrecom) always land in Manual Queue with a note — never auto-applied.

## Product

Three-tab dashboard tracking 150+ daily applications:
- **Internships** (50/day): Tunisia-first + worldwide, IoT/DevOps/Cloud/Networks/Cybersecurity
- **Accommodation internships** (50/day): Workaway, HelpX, WWOOF, Worldpackers
- **Part-time remote** (50/day): RemoteOK, Jobicy, Remotive, WeWorkRemotely

Features: progress rings, filter chips, applications table, SSE log terminal, priority targets panel, cover letter editor (FR/EN), CV upload, onboarding wizard, test mode.

## User preferences

- Dark terminal-native UI: background #0D1117, surface #161B22, accent #58A6FF
- JetBrains Mono for stats/logs, Inter for body
- Ahmed Ben Kilani — ahmedbenkilani3@gmail.com — INSAT Tunis RT3

## Gotchas

- The SQLite DB path uses `process.cwd()` — make sure to run the server from `artifacts/api-server/` or the DB and uploads will land in the workspace root (which is fine).
- `better-sqlite3` must be in `onlyBuiltDependencies` in `pnpm-workspace.yaml` for native compilation to succeed.
- Adzuna scraper requires `adzuna_api_key` AND `adzuna_app_id` in the config table (set via Settings page).
- Playwright scrapers (Tanitjobs, LinkedIn, WeWorkRemotely, Workaway, etc.) are Phase 2 — not yet implemented. Jobs from these sources land as manual queue.
- node-cron uses `Africa/Tunis` timezone for the `08:00` daily run.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- OpenAPI spec: `lib/api-spec/openapi.yaml` — edit here, run codegen, done
