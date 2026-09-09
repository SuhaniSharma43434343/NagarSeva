# NagarSeva — Master Production Deployment Guide & Runbook

This guide contains the complete, step-by-step procedure to deploy the entire **NagarSeva** municipal infrastructure to production. It covers the **Backend API**, **AI Pothole Detection Microservice**, **SQL Agent Microservice**, **PostgreSQL Database**, **Vercel Web Frontend**, and **React Native Mobile App**.

---

## 📑 Architecture Overview

```
[ Citizen / Admin Web ] --------> [ Vercel Frontend ]
                                          |
                                    HTTPS REST API
                                          v
[ Surveyor Mobile App ] --------> [ Render / Cloud Backend (Node.js/Express) ]
                                      |        |        |
                         +------------+        |        +------------+
                         |                     |                     |
                         v                     v                     v
                 [ PostgreSQL DB ]     [ AI Microservice ]   [ SQL Agent ]
                 (Managed DB/Supabase) (FastAPI + YOLOv8)   (Flask + Groq)
                         ^                                           |
                         +----------------(Read-Only Access)---------+
```

| Service Component | Technology Stack | Hosting Target | Default Port / Health Check |
|---|---|---|---|
| **Backend API** | Node.js 22, Express, Prisma ORM, TypeScript | Render / Railway / VPS | `PORT: 3000` • `/api/ready` & `/api/health` |
| **AI Microservice** | Python 3.12, FastAPI, Ultralytics YOLOv8, PyTorch | Render / Railway / HuggingFace Spaces | `PORT: 7860` • `/ready` & `/health` |
| **SQL Agent** | Python 3.12, Flask, Groq LLM, LangChain | Render / Railway / VPS | `PORT: 5001` • `/health` & `/ready` |
| **Web Frontend** | React 18, Vite, TailwindCSS, TypeScript | Vercel | Port 80/443 (Vercel CDN) |
| **Surveyor App** | React Native 0.83, Android / iOS | Google Play / APK / TestFlight | Native mobile client |
| **Database** | PostgreSQL 15+ | Supabase / Neon / Railway / AWS RDS | Port 5432 |
| **Media Storage** | Cloudinary | Cloudinary CDN | HTTPS secure URLs |

---

## 🔑 Master Environment Variables Reference

Gather and configure these environment variables before beginning deployment:

### 1. Backend (`nagarseva-backend`)
| Variable | Description | Example / Required Value |
|---|---|---|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Listening port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:password@db.supabase.co:5432/postgres?sslmode=require` |
| `JWT_SECRET` | 32+ character random secret for JWT auth | Generate with `openssl rand -hex 32` |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins | `https://nagarseva.vercel.app,https://admin.nagarseva.gov.in` |
| `INTERNAL_API_KEY` | Shared secret for backend-to-microservice auth | Random 32+ character alphanumeric string |
| `MODEL_SERVICE_URL` | HTTPS URL of deployed AI Microservice | `https://nagarseva-ai.onrender.com` |
| `SQL_AGENT_URL` | HTTPS URL of deployed SQL Agent | `https://nagarseva-sql-agent.onrender.com` |
| `SERVICE_TIMEOUT_MS` | Timeout for AI/SQL agent calls in ms | `120000` |
| `cloudinary_cloud_name` | Cloudinary Cloud Name | `your_cloud_name` |
| `cloudinary_api_key` | Cloudinary API Key | `your_api_key` |
| `cloudinary_api_secret` | Cloudinary API Secret | `your_api_secret` |

### 2. AI Microservice (`nagarseva-ai`)
| Variable | Description | Example / Required Value |
|---|---|---|
| `APP_ENV` | Environment mode | `production` |
| `PORT` | Listening port | `7860` |
| `INTERNAL_API_KEY` | Must match backend's `INTERNAL_API_KEY` | Exact same string as backend |
| `POTHOLE_MODEL_URL` | Direct HTTPS URL to download `pothole.pt` | `https://github.com/<org>/<repo>/releases/download/v1.0/pothole.pt` |
| `POTHOLE_MODEL_SHA256` | SHA-256 hash of the `.pt` file | `565906940135e437d21493044145df6f8f637250f1a5a34e1fa054c6fc7c1f80` |

### 3. SQL Agent Microservice (`nagarseva-sql-agent`)
| Variable | Description | Example / Required Value |
|---|---|---|
| `APP_ENV` | Environment mode | `production` |
| `PORT` | Listening port | `5001` |
| `INTERNAL_API_KEY` | Must match backend's `INTERNAL_API_KEY` | Exact same string as backend |
| `DATABASE_URL` | **Read-Only** PostgreSQL user connection string | `postgresql://nagarseva_reader:secure_pass@db.supabase.co:5432/postgres` |
| `GROQ_API_KEY` | API Key from console.groq.com | `gsk_...` |
| `SQL_AGENT_TABLES` | Whitelisted tables for analytical queries | `Ward,Route,Issue,IssueAnalysis,IssueAssignment,IssueResolution,RouteAssignment,SurveySession` |

### 4. Frontend (`Vercel`)
| Variable | Description | Example / Required Value |
|---|---|---|
| `VITE_API_URL` | Deployed backend HTTPS origin (WITHOUT `/api`) | `https://nagarseva-backend.onrender.com` |

### 5. Surveyor Mobile App (`surveyorApp`)
| Variable / File Setting | Location | Required Value |
|---|---|---|
| `PRODUCTION_API_URL` | `surveyorApp/src/config/server.ts` | `https://nagarseva-backend.onrender.com/api` |

---

## 🛠️ Step-by-Step Deployment Instructions

---

### Step 1: Database Setup & Migration (PostgreSQL)

Use an external managed PostgreSQL instance (e.g., **Supabase**, **Neon**, **Railway**, or **AWS RDS**).
> **Note:** Render Free PostgreSQL automatically expires and deletes data after 30 days. Always use an external managed DB for production.

#### 1. Apply Schema Migrations
From your local terminal or CI environment connected to the production database:
```bash
cd backend
# Set DATABASE_URL in your environment or backend/.env
npm ci
npm run db:migrate
```
*The deployment migration (`20260909090000_deployment_schema`) is fully idempotent with `IF NOT EXISTS` guards, making it safe to run on both fresh and existing databases.*

#### 2. Create the Restricted Read-Only SQL Agent User
For security and privacy, the SQL Agent should **never** access the `User` table (which contains password hashes).
Execute `deploy/sql-agent-readonly.sql` in your database SQL editor:
```sql
-- 1. Create role if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'nagarseva_reader') THEN
    CREATE ROLE nagarseva_reader NOLOGIN;
  END IF;
END $$;

-- 2. Grant permissions on municipal tables only
GRANT USAGE ON SCHEMA public TO nagarseva_reader;
GRANT SELECT ON "Ward", "Route", "Issue", "IssueAnalysis", "IssueAssignment",
  "IssueResolution", "RouteAssignment", "SurveySession" TO nagarseva_reader;

-- 3. Create dedicated login for SQL Agent and assign the role
CREATE USER sql_agent_user WITH PASSWORD 'REPLACE_WITH_STRONG_PASSWORD_32_CHARS';
GRANT nagarseva_reader TO sql_agent_user;
```
Now construct the SQL Agent's `DATABASE_URL`:
```
postgresql://sql_agent_user:REPLACE_WITH_STRONG_PASSWORD_32_CHARS@<host>:5432/<database>?sslmode=require
```

#### 3. Bootstrap the Initial Production Administrator
Create your initial municipal admin account securely:
```bash
cd backend

# Set the bootstrap environment variables
$env:DATABASE_URL="postgresql://postgres:password@host:5432/postgres?sslmode=require"
$env:ADMIN_EMAIL="admin@nagarseva.gov.in"
$env:ADMIN_PASSWORD="YourStrongAdminPassword2026!#"
$env:ADMIN_NAME="Municipal Commissioner"
$env:ADMIN_WARD_NAME="Central Ward"
$env:ADMIN_WARD_NUMBER="1"

node scripts/bootstrap-admin.mjs
```
*(On Linux/macOS, replace `$env:VAR="..."` with `export VAR="..."`)*
Once created, clear these variables.

---

### Step 2: Prepare AI Model Weights (`pothole.pt`)

The Git repository contains Git LFS pointer files for the model weights. The AI container's `prepare_models.py` downloads the actual weights on container startup.

1. Upload your trained `pothole.pt` model file to a stable, publicly accessible HTTPS location:
   - **Option A:** GitHub Releases (Create a Release in your repo and attach `pothole.pt` as an asset).
   - **Option B:** HuggingFace Model Hub (Create a public or private model repo with direct file URL).
   - **Option C:** AWS S3 / Cloudflare R2 / Supabase Storage bucket with public read access.
2. Get the SHA-256 checksum of your `.pt` file:
   - **Windows PowerShell:**
     ```powershell
     Get-FileHash -Algorithm SHA256 models/pothole.pt
     ```
   - **Linux / macOS:**
     ```bash
     sha256sum models/pothole.pt
     ```
3. Set `POTHOLE_MODEL_URL` to your HTTPS download URL and `POTHOLE_MODEL_SHA256` to the generated hash in Render/cloud settings.

---

### Step 3: Deploy Backend Services to Render

The repository includes a battle-tested `render.yaml` Blueprint file.

#### Method A: 1-Click Render Blueprint (Recommended)
1. Push your latest code to your GitHub branch (`codex/render-deployment` or `main`).
2. Log into [Render Dashboard](https://dashboard.render.com).
3. Click **New +** -> **Blueprint**.
4. Select your **NagarSeva** repository and the deployment branch.
5. Render reads `render.yaml` and will automatically define all 3 web services:
   - `nagarseva-backend` (Docker context: repository root, Dockerfile: `backend/Dockerfile`)
   - `nagarseva-ai` (Docker context: repository root, Dockerfile: `microservices/Dockerfile`)
   - `nagarseva-sql-agent` (Docker context: repository root, Dockerfile: `sql-agent/Dockerfile`)
6. Fill in the prompted secret environment variables:
   - **Backend:** `DATABASE_URL`, `CORS_ORIGINS`, `cloudinary_cloud_name`, `cloudinary_api_key`, `cloudinary_api_secret`.
   - **AI Microservice:** `POTHOLE_MODEL_URL`, `POTHOLE_MODEL_SHA256`.
   - **SQL Agent:** `DATABASE_URL` (use the read-only user string!), `GROQ_API_KEY`.
7. Click **Apply**. Render will generate the shared `INTERNAL_API_KEY` and link the internal service URLs automatically!

#### Method B: Manual Service Creation (Render / Railway / Koyeb / Docker VPS)
If deploying manually or on another cloud:
1. **AI Microservice:**
   - Build Context: Repository Root (`.`)
   - Dockerfile: `./microservices/Dockerfile`
   - Health Check: `/ready`
   - Port: `7860`
2. **SQL Agent:**
   - Build Context: Repository Root (`.`)
   - Dockerfile: `./sql-agent/Dockerfile`
   - Health Check: `/health`
   - Port: `5001`
3. **Backend:**
   - Build Context: Repository Root (`.`)
   - Dockerfile: `./backend/Dockerfile`
   - Health Check: `/api/ready`
   - Port: `3000`
   - Set `MODEL_SERVICE_URL` and `SQL_AGENT_URL` to the public URLs of the respective services deployed above.

---

### Step 4: Deploy Web Frontend to Vercel

1. Log in to [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository (`NagarSeva`).
4. In **Project Configuration**:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click Edit -> select `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Under **Environment Variables**, add:
   - `VITE_API_URL` = `https://<your-deployed-backend>.onrender.com` *(Do not add `/api` at the end!)*
6. Click **Deploy**.
7. Once deployed, note down your production Vercel domain (e.g. `https://nagarseva.vercel.app`).
8. **Update Backend CORS:** Go to Render -> `nagarseva-backend` -> Environment -> update `CORS_ORIGINS` to include your Vercel URL:
   ```
   https://nagarseva.vercel.app,https://your-custom-domain.com
   ```
   Save changes so Render redeploys the backend with the allowed CORS origin.

---

### Step 5: Configure & Build Surveyor Mobile App

1. Open `surveyorApp/src/config/server.ts`.
2. Replace `const PRODUCTION_API_URL = ""` with your backend HTTPS URL ending in `/api`:
   ```typescript
   const PRODUCTION_API_URL = "https://<your-deployed-backend>.onrender.com/api";
   ```
3. Build the production Android APK:
   ```bash
   cd surveyorApp/android
   ./gradlew assembleRelease
   ```
   The production APK will be generated at:
   `surveyorApp/android/app/build/outputs/apk/release/app-release.apk`
4. Install on surveyor devices or distribute via internal MDM / Play Console Internal Testing.

---

### Step 6: Keep-Warm & Wake-Up Setup (Render Free Tier)

Render Free Web Services automatically sleep after 15 minutes of inactivity. To keep them responsive during municipal operating hours:

#### Option A: GitHub Actions Keep-Warm (Built-in)
1. In your GitHub repository, navigate to **Settings** -> **Secrets and variables** -> **Actions** -> **Variables**.
2. Add the following repository variables:
   - `KEEP_WARM_ENABLED`: `true`
   - `KEEP_WARM_URLS`: JSON array of your health endpoints:
     ```json
     ["https://nagarseva-backend.onrender.com/api/health", "https://nagarseva-ai.onrender.com/health", "https://nagarseva-sql-agent.onrender.com/health"]
     ```
   - `WAKE_TIMEZONE`: `Asia/Kolkata`
   - `WAKE_START_HOUR`: `9`
   - `WAKE_END_HOUR`: `18`
3. Go to **Actions** -> select **Optional daytime wake-up** -> click **Run workflow** to test.

#### Option B: External Uptime Pingers (Free & Reliable)
Set up free 5-minute ping monitors at [UptimeRobot.com](https://uptimerobot.com) or [Cron-job.org](https://cron-job.org):
- URL 1: `https://<backend>.onrender.com/api/health`
- URL 2: `https://<ai-service>.onrender.com/health`
- URL 3: `https://<sql-agent>.onrender.com/health`

---

## ✅ Production Smoke Test & Verification Checklist

Run these tests against your live deployment:

### 1. Service Health Endpoints
```bash
# Backend liveness & DB connectivity
curl -I https://<your-backend>.onrender.com/api/ready
# Expected: HTTP/1.1 200 OK

# AI Microservice readiness & model loaded
curl -I https://<your-ai>.onrender.com/ready
# Expected: HTTP/1.1 200 OK ("model_loaded": true)

# SQL Agent readiness
curl -I https://<your-sql-agent>.onrender.com/health
# Expected: HTTP/1.1 200 OK
```

### 2. Admin Web Portal Verification
1. Navigate to `https://<your-vercel-domain>.vercel.app/login`.
2. Verify that **demo credentials are NOT visible** on the production login form.
3. Log in with the bootstrapped administrator email and password.
4. Verify the Municipal Dashboard loads with real-time statistics and maps.

### 3. Surveyor Photo Upload & Pothole Detection
1. Log into the Surveyor mobile app or use the surveyor API endpoint.
2. Submit a photo with GPS coordinates (`latitude`, `longitude`).
3. Verify:
   - Photo is uploaded to Cloudinary CDN (`res.cloudinary.com/...`).
   - AI service analyzes image, returns bounding boxes, size class, and priority score.
   - Issue appears immediately on the Admin Dashboard map.

### 4. Engineer Repair & Quality Verification
1. Log into engineer view, take an issue in progress.
2. Upload "after" repair photo.
3. Verify repair verification returns `pothole_filled: true` and a calculated `repair_quality_score`.

### 5. SQL Agent Analytic Query
1. In the Admin Dashboard AI Assistant / analytics tab, ask:
   *"How many open pothole issues were reported this week across all wards?"*
2. Verify Groq LLM executes read-only SQL query and returns an accurate municipal summary.

---

## 🚀 Quick Master Deployment Prompt (Copy & Paste)

You can copy and run the following prompt in your terminal or share with any engineer:

```markdown
### NagarSeva Deployment Action Checklist:
1. [ ] Push latest code branch `codex/render-deployment` to GitHub.
2. [ ] Apply database migrations: `npm run db:migrate` in backend directory.
3. [ ] Run `deploy/sql-agent-readonly.sql` in database to create `sql_agent_user`.
4. [ ] Run `node scripts/bootstrap-admin.mjs` to create production admin user.
5. [ ] Upload `models/pothole.pt` to HTTPS storage and note SHA256 checksum.
6. [ ] Deploy Blueprint in Render using `render.yaml` with required environment secrets.
7. [ ] Deploy `frontend` to Vercel with `VITE_API_URL=https://<backend>.onrender.com`.
8. [ ] Add Vercel URL to `CORS_ORIGINS` in Render backend service.
9. [ ] Update `PRODUCTION_API_URL` in `surveyorApp/src/config/server.ts` & build APK.
10. [ ] Set `KEEP_WARM_ENABLED=true` in GitHub Actions or configure UptimeRobot pinger.
```
