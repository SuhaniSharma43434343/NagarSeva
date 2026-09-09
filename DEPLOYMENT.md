# NagarSeva deployment: Render Free + Vercel

Frontend and mobile app -> HTTPS backend -> PostgreSQL, Cloudinary, AI, SQL agent.
The models folder is packaged inside the AI container; weights need no separate web service.

## Render

Use render.yaml on the codex/render-deployment branch. All three services use Free compute.
Docker build context is the repository root. Supply DATABASE_URL, CORS_ORIGINS, Cloudinary credentials,
GROQ_API_KEY and a stable HTTPS POTHOLE_MODEL_URL in Render's private environment fields.
The Blueprint connects service URLs and generates a shared INTERNAL_API_KEY automatically.

Use the existing PostgreSQL database. The agent must use a separate restricted login on the same DB:
deploy/sql-agent-readonly.sql grants SELECT on municipal tables, excluding User/password data.
Rotate the password previously committed in sql-agent/db.py before reusing that database.

The repository's .pt files are Git LFS pointers. The original 88 MB pothole object returned 404.
prepare_models.py downloads operator-supplied weights and verifies their SHA-256 before loading.
POTHOLE_MODEL_SHA256 matches the original pointer; change it if intentionally providing different weights.
Optional GARBAGE_MODEL_URL and GARBAGE_MODEL_SHA256 can store the garbage artifact, but the existing
inference API implements pothole detection only. Missing weights fail startup clearly.

Health endpoints: backend /api/health (liveness), /api/ready (DB connectivity);
AI /health (liveness), /ready (model loaded); SQL /health (liveness), /ready (initialization).
Model and agent operations require X-Service-Key; only the backend stores that key.
Chat additionally requires an administrator JWT. The frontend and app never receive database/service secrets.

## Existing database

Back up and inspect migration status before applying changes. The original migration history missed
IssueAnalysis, GPS/confidence fields, updatedAt, repair quality fields, and nullable issue associations.
A new migration supplies them. All migrations were executed in an isolated embedded PostgreSQL test.
For an existing DB previously changed with db push, compare and baseline the migration history first;
do not blindly run migrations if those columns already exist. Never run migrate reset.
No migration or demo seed runs automatically on deployment.

For an empty DB only: from backend, run npm ci then npm run db:migrate.
For a new installation only, backend/scripts/bootstrap-admin.mjs creates one administrator using explicit
ADMIN_EMAIL, ADMIN_PASSWORD (16+ characters), ADMIN_NAME, ADMIN_WARD_NAME, ADMIN_WARD_NUMBER.
It does not reset existing accounts or seed demo data. Remove bootstrap variables after use.
Production login cannot create an administrator for the first anonymous visitor.
For a complete walkthrough and checklist, see [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md).

## Vercel and mobile

Import the deployment branch, root directory frontend, Vite framework, npm run build, output dist.
Set VITE_API_URL to the deployed backend HTTPS origin, without /api, then deploy.
Add the exact resulting Vercel origin to backend CORS_ORIGINS (comma-separated for multiple origins).
Redeploy Vercel whenever VITE_API_URL changes. vercel.json enables direct navigation to React routes.
Images use Cloudinary HTTPS URLs; production rejects ephemeral local image fallback.
Old localhost image URLs in an existing DB need a separate upload/backfill.

Set PRODUCTION_API_URL in surveyorApp/src/config/server.ts to the backend HTTPS origin plus /api,
then rebuild the release app. Debug builds keep localhost for ADB reverse. Uploads no longer try
unrelated LAN hosts. Release builds reject missing/insecure URLs.

## Free sleep and wake-up limits

Render free web services sleep after 15 idle minutes and share 750 hours/month per workspace.
Three continuously running services would use about 2160 hours in 30 days: free 24/7 is not guaranteed.
The AI's PyTorch/YOLO memory use may exceed Render Free's 512 MB. Real inference must be profiled;
a host with more RAM or a verified optimized runtime may be necessary. No paid upgrade is automatic.
Render free PostgreSQL expires after 30 days; this deployment uses your existing external DB instead.

.github/workflows/keep-warm.yml is optional and inactive until KEEP_WARM_ENABLED=true.
Set repository variable KEEP_WARM_URLS to a JSON array of up to three deployed HTTPS health endpoints.
Defaults: 09:00-16:00 Asia/Kolkata, a probe about every 10 minutes. Override WAKE_TIMEZONE,
WAKE_START_HOUR, WAKE_END_HOUR. Three services plus idle tails use roughly 675 hours/month in
this window, before other traffic. Extra activity can exhaust the quota. Schedules can be delayed,
must exist on the default branch, and may be disabled after public-repository inactivity.
This is best-effort warming, not an uptime guarantee.

## Validation and remaining live checks

Backend: npm ci, npm run build, node --test tests/*.test.mjs.
Frontend: npm ci, npm run build.
Python: install sql-agent/requirements.txt plus fastapi==0.128.0, python-multipart==0.0.22,
httpx==0.28.1, then python -m unittest discover -s tests -v.
API tests mock the LLM/model; they do not establish prediction accuracy.
Render Blueprint was validated against Render's JSON schema.

Before accepting the deployment, verify actual admin login, mobile upload with GPS, persistent
image retrieval after restart, real detection, repair verification, and a live Groq answer.
Docker runtime, model accuracy/memory, mobile release builds, and existing live DB compatibility
still need verification with real configuration.

Sources: https://render.com/docs/free, https://render.com/docs/blueprint-spec,
https://vercel.com/docs/frameworks/frontend/vite.
