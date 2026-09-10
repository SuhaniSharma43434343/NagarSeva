# Deployment status — 2026-09-10

## Completed

- The deployment branch was pushed through commit 98fde64 before infrastructure setup.
- Created the dedicated Neon project `nagarseva-production`, project ID
  `square-boat-38034906`, production branch `br-delicate-king-b39ruu0n`, database
  `neondb`, PostgreSQL 18, AWS Singapore, Free plan.
- Confirmed the public schema was empty, then installed the current application's
  nine-table schema in a transaction through Neon's SQL editor. The local Prisma
  CLI did not run against Neon; credentials were not exported.
- Baselined all nine repository migrations in `_prisma_migrations`, with hashes
  calculated from the deployment checkout and logs explaining the SQL-editor
  baseline. Do not reset or blindly replay the initial migrations.
- Created `nagarseva_reader` as a NOLOGIN group and granted SELECT on the eight
  municipal tables in the runbook. SQL verification returned: nine baseline rows,
  Issue SELECT=true, User SELECT=false, Issue INSERT=false.
- Render parsed the three-service Blueprint using `codex/render-deployment`.
  The Blueprint has not yet been deployed.
- Replaced the unavailable `.pt` download requirement with the already tracked
  YOLO11n ONNX pothole model, SHA-256
  `6dcceaf34d08db94c4fffe3929820e7a115e15b5b122867ded797b8319b58e87`.
- Real local CPU smoke tests passed for readiness, authentication, detection,
  analysis JSON serialization, and visualization using a blank rectangular image.
  This is a runtime check, not validation of detection accuracy. Local Windows
  process RSS was about 420 MB; Render Linux memory remains to be measured.

## Required before going live

- Create a dedicated SQL-agent LOGIN and grant `nagarseva_reader` to it; the
  NOLOGIN group alone is not a usable database connection.
- Configure the backend and SQL agent with their separate Neon connection strings
  in Render, plus the Groq key and Cloudinary VMC key/secret. Credentials must not
  be committed or included in exported pages or logs.
- Bootstrap an administrator with the explicit one-time script after securely
  configuring its inputs; no account or password has been invented or seeded.
- Apply the updated Render Blueprint and verify all services, including live
  inference memory and SQL-agent `/ready`.
- Deploy Vercel with the actual backend origin, set backend CORS, then configure
  and build the mobile release with the actual backend `/api` URL.
- Configure the runbook's keep-warm settings and complete end-to-end smoke tests.

Supabase could not create another free project because the account had reached
its active-project limit; existing projects were left unchanged.
